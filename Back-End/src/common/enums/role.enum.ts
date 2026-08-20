export const Role = {
  Admin: 'admin',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
