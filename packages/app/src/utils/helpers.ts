/**
 * Format a timestamp into a human-readable date string.
 * @param timestamp The timestamp to format.
 * @returns The formatted date string.
 */
export const formatDate = (timestamp: bigint) => {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/**
 * Calculate the distance between two 3D points.
 * @param a The first point.
 * @param b The second point.
 * @returns The distance between the two points.
 */
export const getDistance = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
) => {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.round(Math.sqrt(dx * dx + dz * dz));
};

const IPFS_GATEWAYS = ["https://charactersheets.mypinata.cloud"];

/**
 * Given a URI that may be ipfs, ipns, http, https, ar, or data protocol, return the fetch-able http(s) URLs for the same content
 * @param uri to convert to fetch-able http url
 */
export const uriToHttp = (uri: string): string[] => {
  try {
    const protocol = uri.split(":")[0].toLowerCase();
    switch (protocol) {
      case "blob":
        return [uri];
      case "data":
        return [uri];
      case "https":
        return [uri];
      case "http":
        return ["https" + uri.substring(4), uri];
      case "ipfs": {
        const hash = uri.match(/^ipfs:(\/\/)?(.*)$/i)?.[2];
        return IPFS_GATEWAYS.map((g) => `${g}/ipfs/${hash}`);
      }
      case "ipns": {
        const name = uri.match(/^ipns:(\/\/)?(.*)$/i)?.[2];
        return IPFS_GATEWAYS.map((g) => `${g}/ipns/${name}`);
      }
      case "ar": {
        const tx = uri.match(/^ar:(\/\/)?(.*)$/i)?.[2];
        return [`https://arweave.net/${tx}`];
      }
      default:
        return [uri];
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return [""];
  }
};
