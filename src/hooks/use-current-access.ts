"use client";

import { businessProfile } from "@/data/mock-data";
import { useERPStore } from "@/store/use-erp-store";

export function useCurrentAccess() {
  const currentUserId = useERPStore((state) => state.currentUserId);
  const users = useERPStore((state) => state.users);
  const user = users.find((item) => item.id === currentUserId) ?? null;

  return {
    user,
    role: user?.role ?? null,
    business: businessProfile,
  };
}
