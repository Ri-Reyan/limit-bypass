import { z } from 'zod';

export const ALLOWED_TEMPLATES = ['welcome'];

export const sendEmailSchema = z
  .object({
    to: z
      .string({ required_error: "'to' field is required" })
      .trim()
      .email('Invalid email address format'),
    subject: z
      .string({ required_error: "'subject' field is required" })
      .trim()
      .min(1, 'Subject cannot be empty'),
    text: z
      .string()
      .min(1, 'Text body cannot be empty')
      .optional(),
    template: z
      .object({
        name: z.enum(ALLOWED_TEMPLATES, {
          errorMap: () => ({
            message: `Invalid template name. Allowed templates: ${ALLOWED_TEMPLATES.join(', ')}`,
          }),
        }),
        data: z.record(z.string(), z.unknown()).default({}),
      })
      .strict('Unrecognized fields inside template object')
      .optional(),
  })
  .strict('Unrecognized fields in request payload')
  .refine(
    (data) => Boolean(data.text || data.template),
    {
      message: "At least one of 'text' or 'template' must be provided",
      path: ['text'],
    }
  );

