export async function GET() {
  return Response.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "in.apnamap.app",
          sha256_cert_fingerprints: [
            "46:76:B8:7C:20:3C:E3:BE:B2:06:2E:71:D2:2B:E3:21:A4:26:D4:61:B1:21:22:50:36:13:98:AF:FB:94:CF:D7",
          ],
        },
      },
    ],
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    }
  );
}
