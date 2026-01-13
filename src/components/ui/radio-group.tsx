"use client"

import * as React from "react"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
    value?: string
    onValueChange?: (value: string) => void
}>({})

const RadioGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        value?: string
        defaultValue?: string
        onValueChange?: (value: string) => void
    }
>(({ className, value, defaultValue, onValueChange, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue)

    // Controlled vs Uncontrolled
    const actualValue = value !== undefined ? value : internalValue

    return (
        <RadioGroupContext.Provider
            value={{
                value: actualValue,
                onValueChange: (v) => {
                    if (value === undefined) setInternalValue(v)
                    onValueChange?.(v)
                }
            }}
        >
            <div className={cn("grid gap-2", className)} ref={ref} {...props} />
        </RadioGroupContext.Provider>
    )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext)
    const isChecked = context.value === value

    return (
        <button
            type="button"
            role="radio"
            aria-checked={isChecked}
            data-state={isChecked ? "checked" : "unchecked"}
            className={cn(
                "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            onClick={() => context.onValueChange?.(value)}
            ref={ref}
            {...props}
        >
            {isChecked && (
                <span className="flex items-center justify-center">
                    <Circle className="h-2.5 w-2.5 fill-current text-current" />
                </span>
            )}
        </button>
    )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
