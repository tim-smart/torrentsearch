import "torrent-search-api";

declare module "torrent-search-api" {
  export interface Torrent {
    peers: number;
    seeds: number;
    link?: string;
  }

  export interface TorrentProvider {
    public: boolean;
  }
}
