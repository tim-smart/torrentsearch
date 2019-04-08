///<reference path="torrent-search-api.d.ts"/>
import { Command, flags } from "@oclif/command";
import chalk from "chalk";
import cli from "cli-ux";
import { join } from "path";
import {
  enablePublicProviders,
  loadProviders,
  search,
  Torrent,
} from "torrent-search-api";

loadProviders(join(__dirname, "./providers"));

class Torrentsearch extends Command {
  public static description = "search for torrents";

  public static flags = {
    help: flags.help({ char: "h" }),
    version: flags.version({ char: "v" }),

    category: flags.enum({
      char: "c",
      default: "All",
      options: ["All", "Movies", "TV", "Games", "Music"],
    }),

    limit: flags.integer({
      char: "l",
      default: 30,
    }),
  };

  public static args = [{ name: "query" }];

  public async run() {
    const { args, flags: parsedFlags } = this.parse(Torrentsearch);
    enablePublicProviders();
    const torrents = await search(
      args.query,
      parsedFlags.category,
      parsedFlags.limit!,
    );
    torrents.forEach(torrent => {
      this.logTorrent(torrent);
    });
  }

  private logTorrent(torrent: Torrent) {
    this.log(chalk.bold(torrent.title));
    this.log(
      `${chalk.bold.blue(torrent.size)} - ` +
        `${chalk.bold.green("S:")} ${torrent.seeds} - ` +
        `${chalk.bold.green("P:")} ${torrent.peers} - `,
    );
    if (torrent.magnet) {
      cli.url("magnet", torrent.magnet);
    } else {
      cli.url("link", torrent.desc);
    }
  }
}

export = Torrentsearch;
