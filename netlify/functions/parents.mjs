import { TABLE_IDS, airtableList, hasAirtableConfig, json, tableName } from "./_airtable.mjs";

export const handler = async () => {
  try {
    if (!hasAirtableConfig()) {
      return json(200, [
        { id: "parent_demo_1", name: "M. Cole", email: "parent@example.com", parentalResponsibility: true },
      ]);
    }

    const records = await airtableList(
      tableName("AIRTABLE_PARENTS_TABLE", "Parents/Guardians", TABLE_IDS.PARENTS),
      { pageSize: "100" },
    );
    return json(
      200,
      records.map((record) => ({
        id: record.id,
        name: record.fields["Full Name"] || record.fields.Name || record.fields["Parent/Guardian Name"] || "",
        email: record.fields.Email || "",
        phone: record.fields.Phone || "",
        relationship: record.fields.Relationship || "",
        parentalResponsibility: Boolean(record.fields["Parental Responsibility"]),
      })),
    );
  } catch (error) {
    console.error(error);
    return json(500, { error: "Unable to load parent or guardian records." });
  }
};
