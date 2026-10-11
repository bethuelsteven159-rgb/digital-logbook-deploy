const { z } = require("zod");

const inviteCollaboratorSchema = z.object({
  email: z
    .string({ message: "Invitee email is required" })
    .trim()
    .min(3, "Invitee email is required")
    .max(320, "Invitee email is too long")
    .email("A valid email address is required")
    .transform((email) => email.toLowerCase()),
});

module.exports = {
  inviteCollaboratorSchema,
};
