///<reference path="torrent-search-api.d.ts"/>
import { Command, flags } from "@oclif/command";
import chalk from "chalk";
import cli from "cli-ux";
import * as fs from "fs-extra";
import { join } from "path";
import * as path from "path";
import {
  disableProvider,
  enableProvider,
  enablePublicProviders,
  getMagnet,
  loadProviders,
  search,
  Torrent,
} from "torrent-search-api";

loadProviders(join(__dirname, "./providers"));
enablePublicProviders();
disableProvider("TorrentProject");

class Torrentsearch extends Command {
  public static description = "search for torrents";

  public static flags = {
    help: flags.help({ char: "h" }),
    version: flags.version({ char: "v" }),

    category: flags.enum({
      char: "c",
      default: "All",
      options: ["All", "Movies", "TV", "Games", "Music", "Applications"],
    }),

    limit: flags.integer({
      char: "l",
      default: 30,
    }),
  };

  public static args = [{ name: "query" }];

  public async run() {
    const { args, flags: parsedFlags } = this.parse(Torrentsearch);
    let config: { [key: string]: any } = {};
    try {
      config = await fs.readJSON(
        path.join(this.config.configDir, "config.json"),
      );
    } catch (err) {
      /*empty*/
    }

    Object.keys(config).forEach(provider => {
      enableProvider(
        provider,
        config[provider].username,
        config[provider].password,
      );
    });

    const torrents = await search(
      args.query,
      parsedFlags.category,
      parsedFlags.limit!,
    );
    for (const torrent of torrents) {
      await this.logTorrent(torrent);
    }
  }

  private async logTorrent(torrent: Torrent) {
    this.log(chalk.bold(torrent.title));
    this.log(
      `${chalk.bold.blue(torrent.size)} - ` +
        `${chalk.bold.green("S:")} ${torrent.seeds} - ` +
        `${chalk.bold.green("P:")} ${torrent.peers} - ` +
        `${torrent.time}`,
    );
    if (torrent.magnet) {
      cli.url("magnet", torrent.magnet);
    } else if (torrent.link) {
      cli.url("torrent dl", torrent.link);
    } else {
      const magnet = await getMagnet(torrent);
      if (magnet) {
        cli.url("magnet", magnet);
      } else {
        cli.url("details", torrent.desc);
      }
    }
  }
}

export = Torrentsearch;
