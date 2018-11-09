var ZShepherd = require('zigbee-shepherd');

var Zive = require('zive'),
    Ziee = require('ziee');

const group = 1;

const shepherd = new ZShepherd('/dev/ttyUSB0', {
    sp : { baudRate: 115200, rtscts: true },
});

shepherd.on('ready', async () => {
    console.log('Server is ready.');
    // allow devices to join the network within 60 secs
    await shepherd.permitJoin(255);
    console.log('Waiting for device');
});

function attachDevice(device) {
    device.epList.forEach((epId) => registerOnAfIncomingMsg(device.ieeeAddr, epId));
}

async function registerOnAfIncomingMsg(addr, epId) {
    const ep = shepherd.find(addr, epId);
    console.log('Set onAfIncomingMsg for', addr, epId);
    if (addr === '0x000b57fffe150865') {
        await ep.bind('genLevelCtrl', getCoordinator());
        console.log('bind 0x000b57fffe150865 done');
    } else if (addr === '0xd0cf5efffed6f665') {
        const dst = group; // getCoordinator();
        await ep.bind('genOnOff', dst);
        console.log('bind 0xd0cf5efffed6f665 genOnOff done');
        await ep.bind('genLevelCtrl', dst);
        console.log('bind 0xd0cf5efffed6f665 genLevelCtrl done');
    }
    ep.onAfIncomingMsg = (message) => {
        console.log('onAfIncomingMsg', addr, message.data);
        // var yo = message;
        // zclPacket.parse(message.data, message.clusterid, (error, zclData) => {
        //     console.log('onAfIncomingMsg', ieeeAddr, yo.groupid, yo.data, ':::::', zclData);
        // });
    };
    // console.log('Set onAfIncomingMsg done', ep);
}

function getCoordinator() {
    const device = shepherd.list().find((d) => d.type === 'Coordinator');
    return shepherd.find(device.ieeeAddr, 1);
}

shepherd.start(async (err) => {                 // start the server
    if (err)
        console.log(err);

    console.log('start');

    const ziee = new Ziee();
    ziee.init('genGroups', 'dir', { value: group });
    ziee.init('genGroups', 'cmds', {
        add: function (payload) { console.log('add group', payload); },
    });
    ziee.init('genLevelCtrl', 'dir', { value: 1 });
    ziee.init('genLevelCtrl', 'cmds', {
        moveToLevel: function (payload) { console.log('moveToLevel', payload); },
    });

    ziee.init('genOnOff', 'dir', { value: 1 });
    ziee.init('genOnOff', 'cmds', {
        on: function (payload) { console.log('on', payload); },
        off: function (payload) { console.log('off', payload); },
        toggle: function (payload) { console.log('toggle', payload); },
    });

    const localEp = new Zive({
        profId: 260,  // 'HA'
        devId: 257,   // 'dimmableLight'
        discCmds: []
    }, ziee);

    const epId = await shepherd.mount(localEp);
    console.log('local endpoint mounted', epId);  // 11

    ep = shepherd.find('0x00124b0007b95bbf', epId);
    const dst = group; // getCoordinator();
    await ep.bind('genOnOff', dst);
    console.log('bind coor genOnOff done');
    await ep.bind('genLevelCtrl', dst);
    console.log('bind coor genLevelCtrl done');

    // now attachDevices
    const devices = shepherd.list().filter((device) => device.type !== 'Coordinator');
    console.log('devices', devices);

    devices.forEach((device) => {
        attachDevice(device);
    });
});

shepherd.on('error', function (err) {
    console.log('errrrrrrrrrrrr', err);
});

shepherd.on('ind', function (message) {
    console.log('ind', message);

    if (message.type == 'devIncoming') {
        console.log('devIncoming, new device yeah');
        const device = message.endpoints[0].device;
        const ieeeAddr = device.ieeeAddr;

        console.log('ieeeAddr', ieeeAddr);
        console.log('device', device);

        attachDevice(device);
    }
});


// 0xd0cf5efffed6f665 outlet remote
// 0x000b57fffe277918 dimmer
// 0x000b57fffe150865 other dimmer
