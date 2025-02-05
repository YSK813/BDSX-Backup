//Package
const path = require(`path`);
const event = require(`bdsx/event`);
const launcher = require(`bdsx/launcher`);
const cr = require(`bdsx/commandresult`);
const admZip = require(`adm-zip`);
const zip = new admZip();



//Json files
const config = require(`./config.json`);



//Settings
let lasttime = 0;
let status = false;
let backupLock = false;
let afterOpen = false;
const pluginName = `[BDSX-Backup]`



//Events
event.events.serverOpen.on(() => {
    afterOpen = true;
    if(config.launchBackup) {
        launcher.bedrockServer.executeCommand("save hold", cr.CommandResultType.Data);
        startBackupLog();
    }
})

event.events.playerJoin.on(() => {
    status = true;
})

event.events.serverLeave.on(async () => {
    clearInterval(check && backups);
    afterOpen = false;
    backupLock = true;
    console.log(`${pluginName}: Stop`);
})



//Variable
const backups = setInterval(() => {
    if(!afterOpen) {
        clearInterval(backups);
    } else {
        if(date() / 1000 - lasttime >= config.intervalMin * 60 && (!config.checkActive || (config.checkActive && status))) {
            launcher.bedrockServer.executeCommand("save hold", cr.CommandResultType.Data);
            startBackupLog();
        } else {
            console.log(`[BDSX-Backup] SKip Backup (${Math.round(config.intervalMin * 60 - (date().getTime() / 1000 - lasttime))} seconds left)`);
        }
    }
}, config.checkMin * 60000)

const check = setInterval(() => {
    if(!afterOpen) return;
    if(backupLock) return;
    const cmd = launcher.bedrockServer.executeCommand("save query", cr.CommandResultType.Data);
    if(cmd.data.statusCode === 0) {
        console.log(cmd.data.statusMessage);
        backupLock = true;
        backup();
    }
}, 5000)



//Functions
function startBackupLog() {
    console.log(`${pluginName}: Start Backup...`);
    for(const player of launcher.bedrockServer.serverInstance.getPlayers()) {
        player.sendMessage(`${pluginName}: Start Backup...`);
    }
}

function finishBackupLog() {
    console.log(`${pluginName}: Finish Backup!`);
    for(const player of launcher.bedrockServer.serverInstance.getPlayers()) {
        player.sendMessage(`${pluginName}: Finish Backup!`);
    }
    launcher.bedrockServer.executeCommand("save resume", cr.CommandResultType.Data);
}

async function backup() {
    lasttime = Math.round(date() / 1000);
    try {
        zip.addLocalFolder(path.resolve(__dirname, `../../bedrock_server/worlds/${config.WorldName}`));
        zip.writeZip(`${path.resolve(__dirname, config.saveDirectory)}/${date().getFullYear()}-${date().getMonth() + 1}-${date().getDate()}-${date().getHours()}-${date().getMinutes()}-${date().getSeconds()}.zip`, (err) => {
            if(err) {
                console.log(`${pluginName}: Error log:\n${err}`);
                return;
            } else {
                if(launcher.bedrockServer.serverInstance.getPlayers().length == 0) {
                    status = false;
                } else {
                    status = true;
                }
                finishBackupLog();
                backupLock = false;
            }
        })
    } catch(err) {
        console.log(`${pluginName}: Error Log:\n${err}`);
    }
}

function date() {
    return new Date()
}