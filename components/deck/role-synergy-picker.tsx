"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagRepository } from "@/lib/db/repositories/tag-repository";
import { tagKeys, useTags } from "@/lib/hooks/use-tags";
import type { TagCategory } from "@/types";
import type { Tag } from "@/types/card";
import { cn } from "@/lib/utils";

type RoleSynergyPickerProps = {
  category: Extract<TagCategory, "role" | "synergy">;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function RoleSynergyPicker({
  category,
  selectedIds,
  onChange,
}: RoleSynergyPickerProps) {
  const { tags } = useTags();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const relevant = tags.filter(
      (t) => t.category === category || t.category === "custom",
    );
    if (!needle) return relevant;
    return relevant.filter((t) => t.name.toLowerCase().includes(needle));
  }, [tags, query, category]);

  function toggle(tag: Tag) {
    if (selectedIds.includes(tag.id)) {
      onChange(selectedIds.filter((id) => id !== tag.id));
    } else {
      onChange([...selectedIds, tag.id]);
    }
  }

  async function createCustom() {
    const name = customName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const tag = await new TagRepository().create({
        name,
        category: "custom",
      });
      await queryClient.invalidateQueries({ queryKey: tagKeys.all });
      onChange([...selectedIds, tag.id]);
      setCustomName("");
      toast.success(`Created tag “${name}”`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create tag");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-3"
      data-testid={`role-synergy-picker-${category}`}
    >
      <Input
        data-testid={`${category}-search`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${category}s…`}
      />

      <ul className="border-border max-h-48 overflow-y-auto border">
        {filtered.map((tag) => {
          const checked = selectedIds.includes(tag.id);
          return (
            <li key={tag.id}>
              <label
                className={cn(
                  "border-border flex min-h-11 cursor-pointer items-center gap-3 border-b-2 px-3 py-2 last:border-b-0",
                  checked && "bg-primary/10",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(tag)}
                  data-testid={`tag-check-${tag.id}`}
                  className="size-4"
                />
                <span className="font-bold">{tag.name}</span>
                {tag.category === "custom" ? (
                  <span className="text-muted-foreground ml-auto font-mono text-[0.625rem] uppercase">
                    Custom
                  </span>
                ) : null}
              </label>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="text-muted-foreground p-3 text-sm">No tags found</li>
        ) : null}
      </ul>

      <div className="flex gap-2">
        <Input
          data-testid={`${category}-custom-input`}
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Create custom tag"
        />
        <Button
          type="button"
          variant="outline"
          disabled={creating || !customName.trim()}
          data-testid={`${category}-custom-create`}
          onClick={() => void createCustom()}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
