import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/helpers/utils"

const inputVariants = cva(
  "w-full min-w-0 rounded-md border border-input transition-[color,box-shadow] outline-none file:inline-flex file:border-0 file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default: "h-9 px-2.5 py-1 text-base file:h-7 file:text-sm focus-visible:ring-3 aria-invalid:ring-3 md:text-sm",
        small: "h-7 px-2 py-0.5 text-xs file:h-6 file:text-xs focus-visible:ring-2 aria-invalid:ring-2 md:text-xs",
      },
      background: {
        default: "bg-background",
        transparent: "bg-background/40",
      },
    },
    defaultVariants: {
      variant: "default",
      background: "default",
    },
  }
)

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & VariantProps<typeof inputVariants>
>(function Input({ className, type, variant, background, ...props }, reference) {
  return (
    <input
      ref={reference}
      type={type}
      data-slot="input"
      data-variant={variant}
      data-background={background}
      className={cn(inputVariants({ variant, background }), className)}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input, inputVariants }
