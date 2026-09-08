export class CloudinaryUtils {
  static transformUrlForPackIcon(url: string): string {
    if (!url || typeof url !== "string") return url;
    if (!url.includes("cloudinary.com") && !url.includes("res.cloudinary")) {
      return url;
    }

    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split("/");

      const uploadIdx = pathSegments.indexOf("upload");
      if (uploadIdx === -1) return url;

      const transformParams = "c_fill,w_256,h_256,f_webp,q_auto";
      const insertAt = uploadIdx + 1;

      if (
        insertAt < pathSegments.length &&
        /^[a-z][a-z0-9]*_/.test(pathSegments[insertAt]) &&
        !/^v\d+$/.test(pathSegments[insertAt])
      ) {
        pathSegments[insertAt] = transformParams;
      } else {
        pathSegments.splice(insertAt, 0, transformParams);
      }

      urlObj.pathname = pathSegments.join("/");
      return urlObj.toString();
    } catch {
      return url;
    }
  }
}
