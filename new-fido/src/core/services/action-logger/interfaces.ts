import {FindAllOptions} from "../../repositories/action-logger";
import {Optional} from "../../../libs/typescript";
import {AuthUser} from "../../types/auth-user";


export enum ActionStatus {
    Attempt = 'attempt',
    Success = 'success',
    Failure = 'failure',
}


export enum KnownActionNames {
    ParcelDeliveryCreate = 'ParcelDeliveryCreate',
    ImportManagerSaveToDb = 'ImportManagerSaveToDb',
}

export type ActionToLog = Omit<IActionLog<KnownActionNames>, 'timestamp'>


export interface IActionLog<TName extends string = string> {
    id: string;
    name: TName,
    type: ActionStatus,
    author?: AuthUser,
    parentActionId: string
    details?: Record<string, unknown>,
    timestamp: string
}

export interface IActionLoggerService {
    getLoggedAction(options: FindAllOptions): Promise<IActionLog[]>
    logAction(action: Optional<ActionToLog, 'parentActionId'>): void
    attemptAction<T>(args: Omit<ActionToLog, 'type' | 'id' | 'parentActionId'>, func: () => Promise<T>): Promise<T>
}
