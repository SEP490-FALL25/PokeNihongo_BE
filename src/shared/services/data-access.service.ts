import { Injectable } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { AiPolicyScope } from '@prisma/client'

export type AiPolicyEntity = {
    entity: string
    scope: AiPolicyScope
    fields: string[]
    filter?: Record<string, any>
}

export type AiContextPolicy = {
    purpose: string
    entities: AiPolicyEntity[]
    maskingRules?: Record<string, 'mask' | 'drop' | 'none'>
}

@Injectable()
export class DataAccessService {
    constructor(private readonly prisma: PrismaService) { }

    // Demo method: fetch data by policy for one user
    async getAiSafeData(userId: number, policy: AiContextPolicy): Promise<Record<string, any[]>> {
        const result: Record<string, any[]> = {}
        for (const e of policy.entities || []) {
            const where = this.buildWhere(userId, e)
            const select = this.buildSelect(e.fields)
            const data = await (this.prisma as any)[this.toCamel(e.entity)].findMany({ where, select })
            result[e.entity] = (data || []).map((row: any) => this.applyMasking(row, policy.maskingRules || {}))
        }
        return result
    }

    private buildWhere(userId: number, entity: AiPolicyEntity): any {
        const base: any = { ...(entity.filter || {}) }
        if (entity.scope === AiPolicyScope.SELF_ONLY) {
            base.userId = userId
        }
        return base
    }

    private buildSelect(fields: string[]): any {
        const select: any = {}
        for (const f of fields || []) select[f] = true
        return select
    }

    private applyMasking<T extends Record<string, any>>(row: T, rules: Record<string, 'mask' | 'drop' | 'none'>): T {
        const clone: any = { ...row }
        for (const [field, rule] of Object.entries(rules || {})) {
            if (!(field in clone)) continue
            if (rule === 'drop') delete clone[field]
            else if (rule === 'mask') clone[field] = '***'
        }
        return clone
    }

    private toCamel(name: string): string {
        return name.charAt(0).toLowerCase() + name.slice(1)
    }
}


