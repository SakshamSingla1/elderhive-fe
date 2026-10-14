// Must stay in sync with com.elderhive.enums.UserTypeEnum (backend) — any value added,
// renamed, or removed there needs the identical change made here. Modeled as a const
// object + derived type (ElderSphere's own convention), not a TS `enum`, for cleaner
// interop with verbatimModuleSyntax and real-object (not generated-code) ergonomics.
export const UserTypeEnum = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  ELDER: "ELDER",
  CARETAKER: "CARETAKER",
  FAMILY_MEMBER: "FAMILY_MEMBER",
} as const;
export type UserTypeEnum = (typeof UserTypeEnum)[keyof typeof UserTypeEnum];

// Must stay in sync with com.elderhive.enums.UserStatusEnum (backend) — needed to type
// RegisterResponse.status (useAuthService.ts); same sync obligation as UserTypeEnum above.
export const UserStatusEnum = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;
export type UserStatusEnum = (typeof UserStatusEnum)[keyof typeof UserStatusEnum];
