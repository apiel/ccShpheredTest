var ZShepherd = require('zigbee-shepherd');

var Zive = require('zive'),
    Ziee = require('ziee');

// var zclPacket = require('zcl-packet');
var shepherd = new ZShepherd('/dev/ttyUSB0', {
    sp : { baudRate: 115200, rtscts: true },
});

shepherd.on('ready', function () {
    console.log('Server is ready.');

    // allow devices to join the network within 60 secs
    shepherd.permitJoin(255, function (err) {
        console.log('callback join');
        if (err)
            console.log(err);
    });
});

function attachDevice(device) {
    // var ep = ep ? ep : device.epList[0];
    // attachDevice2(device.ieeeAddr, ep);
    device.epList.forEach((epId) => registerOnAfIncomingMsg(device.ieeeAddr, epId));
}

function registerOnAfIncomingMsg(addr, epId) {
    var ep = shepherd.find(addr, epId);
    console.log('Set onAfIncomingMsg for', addr, epId);
    if (addr === '0x000b57fffe150865') {
        ep.bind('genLevelCtrl', getCoordinator(), (err) => { console.log('bind 0x000b57fffe150865 done', err); });
    } else if (addr === '0xd0cf5efffed6f665') {
        // console.log('yoooooooo', ep);
        // var coordinator = getCoordinator();
        // var dst = getCoordinator(); // 1; // group?
        var dst = 1; // group?
        // ep.bind('genOnOff', getCoordinator(), (err) => { console.log('bind 0xd0cf5efffed6f665 genOnOff done', err); });
        // ep.bind('genLevelCtrl', getCoordinator(), (err) => { console.log('bind 0x000b57fffe150865 genLevelCtrl done', err); });
        ep.bind('genOnOff', dst, (err) => {
            console.log('bind 0xd0cf5efffed6f665 genOnOff done', err);
            ep.bind('genLevelCtrl', dst, (err) => { console.log('bind 0xd0cf5efffed6f665 genLevelCtrl done', err); });
        });

        // console.log('getCoordinator()', getCoordinator());
        ep = shepherd.find('0x00124b0007b95bbf', 11);
        ep.bind('genOnOff', dst, (err) => {
            console.log('bind coor genOnOff done', err);
            ep.bind('genLevelCtrl', dst, (err) => { console.log('bind coor genLevelCtrl done', err); });
        });
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

shepherd.start(function (err) {                 // start the server
    if (err)
        console.log(err);

    console.log('start');

    var ziee = new Ziee();
    ziee.init('genGroups', 'dir', { value: 1 });
    ziee.init('genLevelCtrl', 'dir', { value: 1 });
    // ziee.init('genGroups', 'attrs', { 65533: 1, nameSupport: 0 });

    ziee.read('genLevelCtrl', 'dir', function (err, data) {
        if (!err)
            console.log('genLevelCtrl', data);  // 10
    });

    var localEp = new Zive({
        profId: 260,  // 'HA'
        devId: 257,   // 'dimmableLight'
        discCmds: []
    }, ziee);

    shepherd.mount(localEp, function (err, epId) {
        if (!err) {
            console.log('local endpoint mounted', epId);  // 11

            // now attachDevices
            var devices = shepherd.list().filter((device) => device.type !== 'Coordinator');
            console.log('devices', devices);

            devices.forEach((device) => {
                attachDevice(device);
            });
        }
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
