export interface AccessTokenPayloadCreate {
  userId: number
  deviceId: number
  roleId: number
  roleName: string
}

export interface AccessTokenPayload extends AccessTokenPayloadCreate {
  exp: number
  iat: number
}

export interface RefreshTokenPayloadCreate {
  userId: number
}

export interface RefreshTokenPayload extends RefreshTokenPayloadCreate {
  exp: number
  iat: number
}
export interface GuestAccessTokenPayloadCreate {
  guestId: number
  roleName: string
  tableNumber: number
  tableToken: string
}

export interface GuestAccessTokenPayload extends GuestAccessTokenPayloadCreate {
  exp: number
  iat: number
}
