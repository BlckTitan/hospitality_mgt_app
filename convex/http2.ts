// import { httpAction } from './_generated/server';
// import { api } from './_generated/api';
// import { verifyWebhookSignature } from '@clerk/backend';

// export const handleClerkWebhook = httpAction(async (ctx, request) => {
//   const { headers, body } = request;

//   // Verify webhook signature
//   const svixId = headers.get('svix-id') ?? '';
//   const svixTimestamp = headers.get('svix-timestamp') ?? '';
//   const svixSignature = headers.get('svix-signature') ?? '';
//   const payload = await body.text();

//   try {
//     await verifyWebhookSignature({
//       payload,
//       svix_id: svixId,
//       svix_timestamp: svixTimestamp,
//       svix_signature: svixSignature,
//       signingSecret: process.env.CLERK_WEBHOOK_SECRET,
//     });

//     const event = JSON.parse(payload);
//     const clerkId = event.data.id;

//     switch (event.type) {
//       case 'user.created':
//         await ctx.runMutation(api.users.create, {
//           clerkId,
//           email: event.data.email_addresses[0]?.email_address,
//           firstName: event.data.first_name,
//           lastName: event.data.last_name,
//           createdAt: Date.now(),
//           updatedAt: Date.now(),
//           metadata: event.data.public_metadata || {},
//         });
//         break;
//       case 'user.updated':
//         await ctx.runMutation(api.users.update, {
//           clerkId,
//           email: event.data.email_addresses[0]?.email_address,
//           firstName: event.data.first_name,
//           lastName: event.data.last_name,
//           updatedAt: Date.now(),
//           metadata: event.data.public_metadata || {},
//         });
//         break;
//       case 'user.deleted':
//         await ctx.runMutation(api.users.remove, { clerkId });
//         break;
//     }

//     return new Response(null, { status: 200 });
//   } catch (error) {
//     console.error('Webhook verification failed:', error);
//     return new Response('Invalid webhook signature', { status: 400 });
//   }
// });