
// A gradual type for salla app events including id, merchant
export interface SallaAppEventBase {
    event: string
    merchant: number
    created_at: string
    data?: object
}

export interface SallaAppAuthorizedEvent extends SallaAppEventBase {
    data: {
        access_token: string
        refresh_token: string
        expires: number
    }
}

