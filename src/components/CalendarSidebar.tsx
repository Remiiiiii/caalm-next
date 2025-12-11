'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SharedCalendar {
  $id: string;
  name: string;
  ownerId: string;
  ownerName?: string;
  sharedWith?: string[];
}

interface CalendarSidebarProps {
  selectedMyCalendars: {
    calendar: boolean;
    usHolidays: boolean;
  };
  selectedSharedCalendars: string[]; // Array of calendar IDs
  onMyCalendarChange: (
    calendar: 'calendar' | 'usHolidays',
    checked: boolean
  ) => void;
  onSharedCalendarChange: (calendarId: string, checked: boolean) => void;
  sharedCalendars: SharedCalendar[];
  loadingSharedCalendars: boolean;
}

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
  selectedMyCalendars,
  selectedSharedCalendars,
  onMyCalendarChange,
  onSharedCalendarChange,
  sharedCalendars,
  loadingSharedCalendars,
}) => {
  const [isMyCalendarsExpanded, setIsMyCalendarsExpanded] = useState(true);
  const [isSharedCalendarsExpanded, setIsSharedCalendarsExpanded] =
    useState(true);

  return (
    <div className="w-48 border-r border-slate-200">
      <div className="p-4 space-y-4">
        {/* My calendars section */}
        <div>
          <button
            onClick={() => setIsMyCalendarsExpanded(!isMyCalendarsExpanded)}
            className="flex items-center justify-between w-full text-left font-medium text-slate-700 hover:text-slate-900 mb-2"
          >
            <span className="text-sm">My calendars</span>
            {isMyCalendarsExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {isMyCalendarsExpanded && (
            <div className="space-y-2 ml-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  className={`h-4 w-4 rounded-full ${
                    selectedMyCalendars.calendar ? '!bg-[#00c1cb]' : 'bg-white'
                  }`}
                  id="calendar-main"
                  checked={selectedMyCalendars.calendar}
                  onCheckedChange={(checked) =>
                    onMyCalendarChange('calendar', checked === true)
                  }
                />
                <Label
                  htmlFor="calendar-main"
                  className="text-xs font-normal cursor-pointer"
                >
                  Calendar
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  className={`h-4 w-4 rounded-full ${
                    selectedMyCalendars.usHolidays
                      ? '!bg-[#00c1cb]'
                      : 'bg-white'
                  }`}
                  id="calendar-holidays"
                  checked={selectedMyCalendars.usHolidays}
                  onCheckedChange={(checked) =>
                    onMyCalendarChange('usHolidays', checked === true)
                  }
                />
                <Label
                  htmlFor="calendar-holidays"
                  className="text-xs font-normal cursor-pointer"
                >
                  United States holidays
                </Label>
              </div>
            </div>
          )}
        </div>

        {/* Shared Calendars section */}
        <div>
          <button
            onClick={() =>
              setIsSharedCalendarsExpanded(!isSharedCalendarsExpanded)
            }
            className="flex items-center justify-between w-full text-left font-medium text-slate-700 hover:text-slate-900 mb-2"
          >
            <span className="text-sm">Shared Calendars</span>
            {isSharedCalendarsExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {isSharedCalendarsExpanded && (
            <div className="space-y-2 ml-2">
              {loadingSharedCalendars ? (
                <div className="text-sm text-slate-500">Loading...</div>
              ) : sharedCalendars.length === 0 ? (
                <div className="text-sm text-slate-500">
                  No shared calendars
                </div>
              ) : (
                sharedCalendars.map((calendar) => {
                  const isChecked = selectedSharedCalendars.includes(
                    calendar.$id
                  );
                  return (
                    <div
                      key={calendar.$id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        className={`h-4 w-4 rounded-full ${
                          isChecked ? '!bg-[#00c1cb]' : 'bg-white'
                        }`}
                        id={`shared-${calendar.$id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          onSharedCalendarChange(calendar.$id, checked === true)
                        }
                      />
                      <Label
                        htmlFor={`shared-${calendar.$id}`}
                        className="text-xs font-normal cursor-pointer"
                      >
                        {calendar.ownerName || calendar.name}
                      </Label>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
