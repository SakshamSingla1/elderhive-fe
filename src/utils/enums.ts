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

// Must stay in sync with com.elderhive.enums.NotificationTypeEnum (backend) — needed to
// type useNotificationService.ts/useNotificationPreferenceService.ts's response shapes.
export const NotificationTypeEnum = {
  BOOKING: "BOOKING",
  EMERGENCY: "EMERGENCY",
  ACCOUNT: "ACCOUNT",
  SYSTEM: "SYSTEM",
} as const;
export type NotificationTypeEnum = (typeof NotificationTypeEnum)[keyof typeof NotificationTypeEnum];

// Must stay in sync with com.elderhive.enums.GenderEnum (backend) — needed to type
// useElderProfileService.ts's ElderProfileResponse/ElderProfileRequest.
export const GenderEnum = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
} as const;
export type GenderEnum = (typeof GenderEnum)[keyof typeof GenderEnum];

// Must stay in sync with com.elderhive.enums.CaretakerVerificationStatusEnum (backend) —
// needed to type useCaretakerService.ts's CaretakerProfileResponse.
export const CaretakerVerificationStatusEnum = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
} as const;
export type CaretakerVerificationStatusEnum = (typeof CaretakerVerificationStatusEnum)[keyof typeof CaretakerVerificationStatusEnum];

// Must stay in sync with com.elderhive.enums.DocumentReviewStatusEnum (backend) — needed
// to type useCaretakerService.ts's CaretakerVerificationDocumentResponse.
export const DocumentReviewStatusEnum = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type DocumentReviewStatusEnum = (typeof DocumentReviewStatusEnum)[keyof typeof DocumentReviewStatusEnum];

// Must stay in sync with com.elderhive.enums.LinkInviteStatusEnum (backend) — needed to
// type useInviteService.ts's InviteResponse.
export const LinkInviteStatusEnum = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
} as const;
export type LinkInviteStatusEnum = (typeof LinkInviteStatusEnum)[keyof typeof LinkInviteStatusEnum];

// Must stay in sync with com.elderhive.enums.DayOfWeekEnum (backend) — needed to type
// useCaretakerService.ts's availability slot DTOs.
export const DayOfWeekEnum = {
  MONDAY: "MONDAY",
  TUESDAY: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  FRIDAY: "FRIDAY",
  SATURDAY: "SATURDAY",
  SUNDAY: "SUNDAY",
} as const;
export type DayOfWeekEnum = (typeof DayOfWeekEnum)[keyof typeof DayOfWeekEnum];

// Calendar order (Monday -> Sunday) - CaretakerAvailabilityRepository's own
// findByCaretakerIdOrderByDayOfWeekAscStartTimeAsc sorts by the day_of_week STRING column
// alphabetically (FRIDAY, MONDAY, SATURDAY, ...), not calendar order, so
// WeeklyAvailabilityView/Editor iterate this constant client-side instead of trusting
// whatever order the backend returns.
export const DAYS_OF_WEEK: DayOfWeekEnum[] = [
  DayOfWeekEnum.MONDAY,
  DayOfWeekEnum.TUESDAY,
  DayOfWeekEnum.WEDNESDAY,
  DayOfWeekEnum.THURSDAY,
  DayOfWeekEnum.FRIDAY,
  DayOfWeekEnum.SATURDAY,
  DayOfWeekEnum.SUNDAY,
];

export const DayOfWeekShortLabels: Record<DayOfWeekEnum, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

// Must stay in sync with com.elderhive.enums.ServiceCategoryStatusEnum (backend) — needed
// to type useServiceCategoryService.ts's ServiceCategoryResponse/ServiceCategoryPayload.
export const ServiceCategoryStatusEnum = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type ServiceCategoryStatusEnum = (typeof ServiceCategoryStatusEnum)[keyof typeof ServiceCategoryStatusEnum];

// Must stay in sync with com.elderhive.enums.ServiceOfferingStatusEnum (backend) — needed
// to type useServiceOfferingService.ts's ServiceOfferingResponse/ServiceOfferingPayload.
export const ServiceOfferingStatusEnum = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type ServiceOfferingStatusEnum = (typeof ServiceOfferingStatusEnum)[keyof typeof ServiceOfferingStatusEnum];

// Must stay in sync with com.elderhive.enums.BookingStatusEnum (backend) — needed to type
// useBookingService.ts's BookingResponse. Linear PENDING -> CONFIRMED -> IN_PROGRESS ->
// COMPLETED, with CANCELLED reachable from any of the first three (BookingServiceImpl's
// own documented lifecycle, Prompt 77).
export const BookingStatusEnum = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type BookingStatusEnum = (typeof BookingStatusEnum)[keyof typeof BookingStatusEnum];

// Must stay in sync with com.elderhive.enums.EmergencyAlertStatusEnum (backend) — needed
// to type useEmergencyAlertService.ts's EmergencyAlertResponse. Linear TRIGGERED ->
// ACKNOWLEDGED -> RESOLVED, no CANCELLED escape hatch (Prompt 81's own documented
// lifecycle - a false alarm is still acknowledged/resolved through the normal flow).
export const EmergencyAlertStatusEnum = {
  TRIGGERED: "TRIGGERED",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  RESOLVED: "RESOLVED",
} as const;
export type EmergencyAlertStatusEnum = (typeof EmergencyAlertStatusEnum)[keyof typeof EmergencyAlertStatusEnum];

// Must stay in sync with com.elderhive.enums.EntityTypeEnum (backend) — needed to type
// useAuditLogService.ts's filter and AuditLogResponse.
export const EntityTypeEnum = {
  USER: "USER",
  ROLE: "ROLE",
  EMERGENCY_ALERT: "EMERGENCY_ALERT",
} as const;
export type EntityTypeEnum = (typeof EntityTypeEnum)[keyof typeof EntityTypeEnum];

// Must stay in sync with com.elderhive.enums.ActionType (backend) — needed to type
// useAuditLogService.ts's filter and AuditLogResponse.
export const ActionType = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  GRANT: "GRANT",
  REVOKE: "REVOKE",
  NOTIFY: "NOTIFY",
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

// Must stay in sync with com.elderhive.enums.PaymentStatusEnum (backend) — needed to type
// usePaymentService.ts's PaymentResponse. Driven entirely by Stripe webhook events; this
// app never sets any of these itself.
export const PaymentStatusEnum = {
  PENDING: "PENDING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatusEnum = (typeof PaymentStatusEnum)[keyof typeof PaymentStatusEnum];

// Must stay in sync with com.elderhive.enums.ContactUsStatusEnum (backend) — needed to
// type useContactUsService.ts's ContactUsResponse.
export const ContactUsStatusEnum = {
  NEW: "NEW",
  RESPONDED: "RESPONDED",
  CLOSED: "CLOSED",
} as const;
export type ContactUsStatusEnum = (typeof ContactUsStatusEnum)[keyof typeof ContactUsStatusEnum];
