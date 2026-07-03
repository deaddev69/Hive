import { useMutation } from "convex/react";
import { toast } from "@hive/utils";
import { ConvexError } from "convex/values";
import { useCallback } from "react";

export function useConvexMutation(
  mutationReferenceOrFunc: any
) {
  const isFunc = typeof mutationReferenceOrFunc === "function";
  const executeMutation = isFunc ? mutationReferenceOrFunc : useMutation(mutationReferenceOrFunc);

  return useCallback(
    async (...args: any[]): Promise<any> => {
      try {
        return await executeMutation(...args);
      } catch (err: any) {
        let message = "An error occurred";
        if (err instanceof ConvexError) {
          message = err.data as string;
        } else if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === "string") {
          message = err;
        } else if (err && typeof err === "object" && "message" in err) {
          message = String(err.message);
        }
        toast.error(message);
        throw err;
      }
    },
    [executeMutation]
  );
}
