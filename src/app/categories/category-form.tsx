"use client";

import { useActionState } from "react";
import type { CategoryActionState } from "@/app/actions/categories";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: CategoryActionState = {};

type ParentOption = {
  id: string;
  name: string;
  label: string;
};

type CategoryFormProps = {
  action: (prev: CategoryActionState, formData: FormData) => Promise<CategoryActionState>;
  parentOptions: ParentOption[];
  defaults?: {
    name?: string;
    parentId?: string | null;
  };
  submitLabel: string;
};

export function CategoryForm({
  action,
  parentOptions,
  defaults,
  submitLabel,
}: CategoryFormProps) {
  const [state, formAction] = useActionState<CategoryActionState, FormData>(
    action,
    initialState,
  );
  const values = state.values;

  return (
    <>
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">分类名称</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="例如：咖啡"
            defaultValue={values?.name ?? defaults?.name ?? ""}
            className="h-11 text-base"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="parentId">父分类</Label>
          <NativeSelect
            id="parentId"
            name="parentId"
            defaultValue={values?.parentId ?? defaults?.parentId ?? ""}
          >
            <option value="">无父分类</option>
            {parentOptions.map((category) => (
              <option value={category.id} key={category.id}>
                {category.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <SubmitButton>{submitLabel}</SubmitButton>
      </form>
    </>
  );
}
