import { z } from "zod";

// Add/Edit-meeting form validation. Error messages are i18n catalog KEYS
// (resolved with t() at render), matching deal.schema.ts. Lives in features/
// for now — no edge function consumes it yet.
//
// Every field is modelled as a string because react-hook-form hands inputs
// strings; conversion (datetime-local → ISO UTC, "" → null) happens at the
// write layer (useMeetings.toMeetingColumns). Attendees is the strictly
// validated jsonb shape from the build plan: name required per line, contact
// free-form optional; the array itself may be empty.

// A native <input type="datetime-local"> yields YYYY-MM-DDTHH:MM (some
// browsers append :SS); the format check guards manual entry.
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

const MAX_ATTENDEES = 20;

export const meetingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "meetings.errors.titleRequired")
    .max(200, "meetings.errors.titleMax"),
  scheduledAt: z
    .string()
    .trim()
    .min(1, "meetings.errors.scheduledAtRequired")
    .refine(
      (value) => DATETIME_LOCAL_PATTERN.test(value),
      "meetings.errors.scheduledAtInvalid",
    ),
  // Optional — empty string means "no location or link" (column is nullable).
  locationOrLink: z.string().trim().max(300, "meetings.errors.locationMax"),
  attendees: z
    .array(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, "meetings.errors.attendeeNameRequired")
          .max(100, "meetings.errors.attendeeNameMax"),
        contact: z.string().trim().max(200, "meetings.errors.attendeeContactMax"),
      }),
    )
    .max(MAX_ATTENDEES, "meetings.errors.attendeesMax"),
  // Optional links — empty string means "not linked" (columns are nullable).
  brandId: z.string(),
  dealId: z.string(),
  notes: z.string().trim().max(1000, "meetings.errors.notesMax"),
});

export type MeetingFormInput = z.infer<typeof meetingSchema>;
