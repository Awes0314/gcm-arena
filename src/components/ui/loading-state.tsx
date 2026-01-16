import { Spinner } from "./spinner"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  message?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingState({ 
  message = "読み込み中...", 
  size = "md",
  className 
}: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <Spinner size={size} className="mb-4" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
