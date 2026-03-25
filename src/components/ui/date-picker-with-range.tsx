import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"

import { cn, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
}

export function DatePickerWithRange({
    className,
    date,
    setDate,
}: DatePickerWithRangeProps) {
    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full sm:w-[260px] justify-start text-left font-normal bg-zinc-950 border-zinc-800 text-zinc-200 text-xs h-8 hover:bg-zinc-900 hover:text-white",
                            !date && "text-zinc-500"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {formatDate(date.from, "DD-MM-YYYY")} {" -> "}
                                    {formatDate(date.to, "DD-MM-YYYY")}
                                </>
                            ) : (
                                formatDate(date.from, "DD-MM-YYYY")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-950 text-zinc-200 border-zinc-800 " align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
