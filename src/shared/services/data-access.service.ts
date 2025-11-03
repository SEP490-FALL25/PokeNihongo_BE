import { Injectable, Logger } from '@nestjs/common'
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
    private readonly logger = new Logger(DataAccessService.name)

    constructor(private readonly prisma: PrismaService) { }

    // Demo method: fetch data by policy for one user
    async getAiSafeData(userId: number, policy: AiContextPolicy): Promise<Record<string, any[]>> {
        const result: Record<string, any[]> = {}
        for (const e of policy.entities || []) {
            try {
                const modelName = this.toCamel(e.entity)
                const model = (this.prisma as any)[modelName]
                if (!model || typeof model.findMany !== 'function') {
                    this.logger.warn(`Model "${modelName}" (from entity "${e.entity}") not found in Prisma Client. Skipping.`)
                    result[e.entity] = []
                    continue
                }
                const where = this.buildWhere(userId, e)
                const select = this.buildSelect(e.fields)
                const data = await model.findMany({ where, select })
                result[e.entity] = (data || []).map((row: any) => this.applyMasking(row, policy.maskingRules || {}))
            } catch (error) {
                this.logger.error(`Error fetching data for entity "${e.entity}":`, error)
                result[e.entity] = []
            }
        }
        return result
    }

    private buildWhere(userId: number, entity: AiPolicyEntity): any {
        const base: any = { ...(entity.filter || {}) }
        // Map by entity to correct relational filter; not all tables have userId column
        switch (entity.entity) {
            case 'UserAnswerLog':
                return {
                    ...base,
                    userExerciseAttempt: { userId }
                }
            case 'UserTestAnswerLog':
                return {
                    ...base,
                    userTestAttempt: { userId }
                }
            case 'QuestionBank':
                // PUBLIC entity - do not add user filter
                return base
            default:
                if (entity.scope === AiPolicyScope.SELF_ONLY) {
                    return { ...base, userId }
                }
                return base
        }
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


