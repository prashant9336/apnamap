export async function GET() {
  return Response.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "in.apnamap.app",
          sha256_cert_fingerprints: [
            "65:24:83:A8:E8:99:81:DD:9D:54:51:9D:7E:D8:ED:5D:28:FC:69:75:1F:BE:88:D8:AF:4F:D6:09:A3:AD:C6:70",
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
