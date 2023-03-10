import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { failCode, HttpResponse, successCode } from 'src/configs/response';
import { PrismaClient, Phong } from '@prisma/client';
const prisma = new PrismaClient()
import * as fs from 'fs'
import { File } from './dto/phong-thue.dto';

@Injectable()
export class PhongThueService {
   constructor(
      private config: ConfigService,
   ) { }

   async layDanhSachPhongThue(): Promise<HttpResponse<Phong[]>> {
      const data = await prisma.phong.findMany()
      data.forEach(phongThue => {
         if (phongThue.id > 21 && phongThue.hinhAnh && phongThue.hinhAnh.search(';base64,') === -1) {
            phongThue.hinhAnh = `${this.config.get('DOMAIN')}/public/images/${phongThue.hinhAnh}`
         }
      })
      return successCode(data)
   }

   async layDanhSachPhongThueTimKiem(tenPhongThue: string): Promise<HttpResponse<Phong[]>> {
      const data = await prisma.phong.findMany(
         { where: { tenPhong: { contains: `%${tenPhongThue}%` } } }
      )
      data.forEach(phongThue => {
         if (phongThue.id > 21 && phongThue.hinhAnh && phongThue.hinhAnh.search(';base64,') === -1) {
            phongThue.hinhAnh = `${this.config.get('DOMAIN')}/public/images/${phongThue.hinhAnh}`
         }
      })
      return successCode(data)
   }

   async layDanhSachPhongThuePhanTrangTimKiem(pageIndex: number, pageSize: number, keyword: string): Promise<HttpResponse<any>> {
      let data: Phong[]
      if (keyword) {
         data = await prisma.phong.findMany(
            { where: { tenPhong: { contains: `%${keyword}%` } } }
         )
      } else {
         data = await prisma.phong.findMany()
      }
      data.forEach(phongThue => {
         if (phongThue.id > 21 && phongThue.hinhAnh && phongThue.hinhAnh.search(';base64,') === -1) {
            phongThue.hinhAnh = `${this.config.get('DOMAIN')}/public/images/${phongThue.hinhAnh}`
         }
      })
      const dataNew = data.slice(pageSize * (pageIndex - 1), pageSize * pageIndex)
      return successCode({
         pageIndex,
         pageSize,
         totalRow: data.length,
         keyword: keyword ? keyword : null,
         data: dataNew
      })
   }

   async layDanhSachPhongThueTheoViTri(id: number): Promise<HttpResponse<Phong[]>> {
      const viTri = await prisma.viTri.findFirst(
         { where: { id }, include: { Phong: true } }
      )
      if (viTri) {
         const danhSachPhong = viTri.Phong
         danhSachPhong.forEach(phongThue => {
            if (phongThue.id > 21 && phongThue.hinhAnh && phongThue.hinhAnh.search(';base64,') === -1) {
               phongThue.hinhAnh = `${this.config.get('DOMAIN')}/public/images/${phongThue.hinhAnh}`
            }
         })
         return successCode(danhSachPhong)
      } else {
         failCode('V??? tr?? kh??ng t???n t???i!')
      }
   }

   async layPhongThueTheoId(id: number): Promise<HttpResponse<Phong>> {
      const data = await prisma.phong.findFirst(
         { where: { id } }
      )
      if (data) {
         if (id > 21 && data.hinhAnh && data.hinhAnh.search(';base64,') === -1) {
            data.hinhAnh = `${this.config.get('DOMAIN')}/public/images/${data.hinhAnh}`
         }
         return successCode(data)
      } else {
         return failCode('Ph??ng thu?? kh??ng t???n t???i!')
      }
   }

   async themPhongThue(req: any, body: Phong): Promise<HttpResponse<Phong>> {
      const { hinhAnh } = body
      if (req.user.role === 'ADMIN') {
         if (hinhAnh.search(';base64,') === -1) {
            delete body.hinhAnh
         }
         delete body.id
         const data = await prisma.phong.create({ data: body })
         return successCode(data)
      } else {
         return failCode('Kh??ng c?? quy???n!')
      }
   }

   async xoaPhongThue(req: any, id: number): Promise<HttpResponse<string>> {
      if (id > 21 && req.user.role === 'ADMIN') {
         const data = await prisma.phong.findFirst(
            { where: { id } }
         )
         if (data) {
            const check = fs.existsSync(process.cwd() + '/public/images/' + data.hinhAnh)
            if (check) {
               fs.unlinkSync(process.cwd() + '/public/images/' + data.hinhAnh)
            }
            await prisma.phong.delete(
               { where: { id } }
            )
            return successCode('Xo?? th??nh c??ng!')
         } else {
            return failCode('Ph??ng thu?? kh??ng t???n t???i!')
         }
      } else {
         return failCode('Kh??ng c?? quy???n!')
      }
   }


   async capNhatPhongThue(req: any, id: number, body: Phong): Promise<HttpResponse<Phong>> {
      if (id > 21 && req.user.role === 'ADMIN') {
         const { hinhAnh } = body
         const data = await prisma.phong.findFirst(
            { where: { id } }
         )
         if (data) {
            if (hinhAnh.search(';base64,') > 0) {
               const check = fs.existsSync(process.cwd() + '/public/images/' + data.hinhAnh)
               if (check) {
                  fs.unlinkSync(process.cwd() + '/public/images/' + data.hinhAnh)
               }
            } else {
               delete body.hinhAnh
            }
            delete body.id
            const dataNew = await prisma.phong.update(
               { data: body, where: { id } }
            )
            if (id > 21 && dataNew.hinhAnh && dataNew.hinhAnh.search(';base64,') === -1) {
               dataNew.hinhAnh = `${this.config.get('DOMAIN')}/public/images/${dataNew.hinhAnh}`
            }
            return successCode(dataNew)
         } else {
            return failCode('Ph??ng thu?? kh??ng t???n t???i!')
         }
      } else {
         return failCode('Kh??ng c?? quy???n!')
      }
   }

   async uploadHinhPhongThue(file: File, req: any, id: number): Promise<HttpResponse<string>> {
      const { size, mimetype, filename } = file
      const phongThue = await prisma.phong.findFirst(
         { where: { id } }
      )
      if (id > 21 && req.user.role === 'ADMIN') {
         if (phongThue) {
            if (mimetype == 'image/jpg' || mimetype == 'image/jpeg' || mimetype == 'image/gif' || mimetype == 'image/png') {
               if (size < 1000000) {
                  const filename = phongThue.hinhAnh
                  // ki???m tra file ???? c?? t???n t???i trong /public/image/
                  const check = fs.existsSync(process.cwd() + '/public/images/' + filename)
                  if (check) {
                     fs.unlinkSync(process.cwd() + '/public/images/' + filename)
                  }
                  await prisma.phong.update({
                     data: { hinhAnh: file.filename },
                     where: { id }
                  })
                  return successCode('C???p nh???t h??nh ph??ng thu?? th??nh c??ng!')
               } else {
                  fs.unlinkSync(process.cwd() + '/public/images/' + filename)
                  return failCode('Dung l?????ng ???nh ph???i nh??? h??n 1MB')
               }
            } else {
               fs.unlinkSync(process.cwd() + '/public/images/' + filename)
               return failCode('?????nh d???ng ???nh ph???i l?? jpg, jpeg, png, gif')
            }
         } else {
            fs.unlinkSync(process.cwd() + '/public/images/' + filename)
            return failCode('Ph??ng thu?? kh??ng t???n t???i!')
         }
      } else {
         fs.unlinkSync(process.cwd() + '/public/images/' + filename)
         return failCode('Kh??ng c?? quy???n!')
      }
   }
}
