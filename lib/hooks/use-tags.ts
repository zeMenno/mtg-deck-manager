"use client";

import { useQuery } from "@tanstack/react-query";

import { useDatabase } from "@/components/providers/database-provider";
import { TagRepository } from "@/lib/db/repositories/tag-repository";
import type { TagCategory } from "@/types";
import type { Tag } from "@/types/card";

export const tagKeys = {
  all: ["tags"] as const,
  list: () => [...tagKeys.all, "list"] as const,
  category: (category: TagCategory) =>
    [...tagKeys.all, "category", category] as const,
};

export function useTags(): {
  tags: Tag[];
  isLoading: boolean;
  refetch: () => void;
} {
  const { ready } = useDatabase();
  const query = useQuery({
    queryKey: tagKeys.list(),
    queryFn: () => new TagRepository().getAll(),
    enabled: ready,
  });

  return {
    tags: query.data ?? [],
    isLoading: !ready || query.isLoading,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useTagsByCategory(category: TagCategory): {
  tags: Tag[];
  isLoading: boolean;
} {
  const { ready } = useDatabase();
  const query = useQuery({
    queryKey: tagKeys.category(category),
    queryFn: () => new TagRepository().listByCategory(category),
    enabled: ready,
  });

  return {
    tags: query.data ?? [],
    isLoading: !ready || query.isLoading,
  };
}
