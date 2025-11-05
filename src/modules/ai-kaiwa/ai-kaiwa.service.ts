import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { AiKaiwaRepository, CreateAiKaiwaBody, UpdateAiKaiwaBody, GetAiKaiwaListQuery } from './ai-kaiwa.repo'

@Injectable()
export class AiKaiwaService {
    constructor(private readonly repo: AiKaiwaRepository) { }

    private validateCreate(body: CreateAiKaiwaBody) {
        if (!body.userId || !body.conversationId || !body.role) {
            throw new BadRequestException('userId, conversationId, role là bắt buộc')
        }
        if (body.audioUrl && !this.isValidUrl(body.audioUrl)) {
            throw new BadRequestException('audioUrl không hợp lệ')
        }
    }

    private isValidUrl(url: string): boolean {
        try { new URL(url); return true } catch { return false }
    }

    async create(body: CreateAiKaiwaBody): Promise<MessageResDTO> {
        this.validateCreate(body)
        const created = await this.repo.create(body)
        return { statusCode: 201, message: 'Tạo bản ghi hội thoại thành công', data: created }
    }

    async findList(query: GetAiKaiwaListQuery): Promise<MessageResDTO> {
        const { data, total } = await this.repo.findMany(query)
        const totalPage = Math.ceil(total / (typeof query.pageSize === 'number' ? query.pageSize : 10))
        return {
            statusCode: 200,
            message: 'Lấy danh sách hội thoại thành công',
            data: {
                results: data,
                pagination: {
                    current: query.currentPage,
                    pageSize: query.pageSize,
                    totalPage,
                    totalItem: total
                }
            }
        }
    }

    async findOne(id: number): Promise<MessageResDTO> {
        const found = await this.repo.findById(id)
        if (!found) throw new NotFoundException('Không tìm thấy bản ghi hội thoại')
        return { statusCode: 200, message: 'Lấy thông tin hội thoại thành công', data: found }
    }

    async update(id: number, body: UpdateAiKaiwaBody): Promise<MessageResDTO> {
        const exist = await this.repo.findById(id)
        if (!exist) throw new NotFoundException('Không tìm thấy bản ghi hội thoại')
        if (body.audioUrl && !this.isValidUrl(body.audioUrl)) {
            throw new BadRequestException('audioUrl không hợp lệ')
        }
        const updated = await this.repo.update(id, body)
        return { statusCode: 200, message: 'Cập nhật hội thoại thành công', data: updated }
    }

    async delete(id: number): Promise<MessageResDTO> {
        const exist = await this.repo.findById(id)
        if (!exist) throw new NotFoundException('Không tìm thấy bản ghi hội thoại')
        await this.repo.delete(id)
        return { statusCode: 200, message: 'Xóa hội thoại thành công', data: { id } as any }
    }
}
