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

// Must stay in sync with com.elderhive.enums.RoleStatusEnum (backend) — needed to type
// useRoleService.ts's RoleResponse/RoleRequest.
export const RoleStatusEnum = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  DELETED: "DELETED",
} as const;
export type RoleStatusEnum = (typeof RoleStatusEnum)[keyof typeof RoleStatusEnum];

// Must stay in sync with com.elderhive.enums.NavLinkStatusEnum (backend) — needed to type
// useNavLinkService.ts's NavLinkResponse/NavLinkRequest.
export const NavLinkStatusEnum = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type NavLinkStatusEnum = (typeof NavLinkStatusEnum)[keyof typeof NavLinkStatusEnum];

// Must stay in sync with com.elderhive.enums.ColorThemeStatusEnum (backend) — needed to
// type useColorThemeService.ts's ColorThemeResponse/ColorThemePayload.
export const ColorThemeStatusEnum = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type ColorThemeStatusEnum = (typeof ColorThemeStatusEnum)[keyof typeof ColorThemeStatusEnum];
