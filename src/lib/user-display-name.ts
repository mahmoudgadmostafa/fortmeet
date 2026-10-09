type UserProfile = {
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export function getUserDisplayName(user: UserProfile): string {
  const metadata = user.user_metadata;
  const displayName =
    [metadata?.display_name, metadata?.full_name, metadata?.name].find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    )?.trim();

  return displayName || user.email?.split("@")[0] || "المستخدم";
}

export function getUserInitial(name: string): string {
  return Array.from(name)[0]?.toLocaleUpperCase() ?? "م";
}
