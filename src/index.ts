///<reference path="torrent-search-api.d.ts"/>
import { Command, flags } from "@oclif/command";
import chalk from "chalk";
import * as fs from "fs-extra";
import * as inquirer from "inquirer";
import {} from "open";
import open = require("open");
import { join } from "path";
import * as path from "path";
import {
  disableProvider,
  enableProvider,
  enablePublicProviders,
  getActiveProviders,
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

    await this.selectProviders();
    const query = await this.getQuery(args);

    const torrents = await search(
      query,
      parsedFlags.category,
      parsedFlags.limit!,
    );

    await this.selectTorrent(torrents);
  }

  private async selectProviders() {
    const providers = getActiveProviders();
    const results = await inquirer.prompt<{ providers: string[] }>([
      {
        message: "Select providers",
        name: "providers",
        type: "checkbox",

        choices: providers.map(p => ({
          checked: true,
          value: p.name,
        })),
      },
    ]);
    providers
      .filter(p => !results.providers.includes(p.name))
      .forEach(p => disableProvider(p.name));
  }

  private async getQuery(args: any): Promise<string> {
    if (args.query) {
      return args.query;
    }

    const result = await inquirer.prompt<{ query: string }>({
      message: "Search query",
      name: "query",
      type: "input",
    });
    return result.query;
  }

  private torrentRow(torrent: Torrent) {
    return (
      `${chalk.yellow(torrent.title)} ` +
      `${chalk.blue(torrent.size)} ` +
      `${chalk.green((torrent.seeds || 0).toString())} ` +
      `${chalk.red((torrent.peers || 0).toString())} ` +
      `${torrent.time}`
    );
  }

  private async selectTorrent(torrents: Torrent[]) {
    const result = await inquirer.prompt<{ torrent: Torrent }>({
      message: "Select a result",
      name: "torrent",
      pageSize: 15,
      type: "rawlist",

      choices: torrents.map(t => ({
        name: this.torrentRow(t),
        value: t,
      })),
    });

    const magnet = await getMagnet(result.torrent);
    await open(magnet || result.torrent.link || result.torrent.desc);
  }
}

export = Torrentsearch;
