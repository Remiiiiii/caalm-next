import * as React from "react";
import { DayPicker, NavProps } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Custom Navbar component for navigation icons
function CustomNavbar(props: NavProps) {
  return (
    <nav className="rdp-nav flex items-center justify-between px-2 py-1">
      <button
        type="button"
        className={cn(buttonVariants({ variant: "ghost" }), "rdp-nav_button")}
        aria-label="Previous Month"
        onClick={props.onPreviousClick}
        disabled={!props.previousMonth}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={cn(buttonVariants({ variant: "ghost" }), "rdp-nav_button")}
        aria-label="Next Month"
        onClick={props.onNextClick}
        disabled={!props.nextMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

// Main Calendar component
export function Calendar({
  className,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("p-3", className)}
      components={{
        Nav: CustomNavbar,
      }}
      {...props}
    />
  );
}

export default Calendar;
