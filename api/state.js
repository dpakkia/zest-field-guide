import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    // GET /api/state?event=bolle26
    if (req.method === "GET") {
      const eventId = req.query.event;

      if (!eventId) {
        return res.status(400).json({
          error: "Missing event parameter"
        });
      }

      const rows = await sql`
        SELECT
          item_id,
          checked,
          client_updated_at,
          server_updated_at
        FROM checklist_state
        WHERE event_id = ${eventId}
        ORDER BY item_id
      `;

      return res.status(200).json({
        event_id: eventId,
        items: rows
      });
    }

    // POST /api/state
    if (req.method === "POST") {
      const {
        event_id,
        item_id,
        checked,
        client_updated_at
      } = req.body ?? {};

      if (
        typeof event_id !== "string" ||
        typeof item_id !== "string" ||
        typeof checked !== "boolean" ||
        typeof client_updated_at !== "number"
      ) {
        return res.status(400).json({
          error: "Invalid request"
        });
      }

      const rows = await sql`
        INSERT INTO checklist_state (
          event_id,
          item_id,
          checked,
          client_updated_at
        )
        VALUES (
          ${event_id},
          ${item_id},
          ${checked},
          ${client_updated_at}
        )

        ON CONFLICT (event_id, item_id)
        DO UPDATE SET
          checked = EXCLUDED.checked,
          client_updated_at = EXCLUDED.client_updated_at,
          server_updated_at = NOW()

        WHERE checklist_state.client_updated_at
          <= EXCLUDED.client_updated_at

        RETURNING
          item_id,
          checked,
          client_updated_at,
          server_updated_at
      `;

      return res.status(200).json({
        ok: true,
        item: rows[0] ?? null
      });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({
      error: "Method not allowed"
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
}
