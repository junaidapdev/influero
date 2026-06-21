import { z } from "zod";

// Add/Edit-reminder form validation for the user-authored quick reminder (a
// reminders row with kind='custom'). Error messages are i18n catalog KEYS
// (resolved with t() at render), matching meeting.schema.ts / expense.schema.ts.
// Every field is a string because react-hook-form hands inputs strings; the
// datetime-local → ISO conversion happens at the write layer
// (useReminders.toReminderColumns). The typed text is denormalized into BOTH
// message_en and message_ar there — a user note isn't translatable, so the
// active locale always renders what they typed.

// A native <input type="datetime-local"> yields YYYY-MM-DDTHH:MM (some browsers
// append :SS); the format check guards manual entry. Same pattern as meetings.
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

export const reminderSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "reminders.errors.textRequired")
    .max(200, "reminders.errors.textMax"),
  remindAt: z
    .string()
    .trim()
    .min(1, "reminders.errors.remindAtRequired")
    .refine(
      (value) => DATETIME_LOCAL_PATTERN.test(value),
      "reminders.errors.remindAtInvalid",
    ),
});

export type ReminderFormInput = z.infer<typeof reminderSchema>;
