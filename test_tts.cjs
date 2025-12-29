const WebSocket = require('ws');
const zlib = require('zlib');
const { v4: uuidv4 } = require('uuid');

const ttsAppId = "4286079913";
const ttsToken = "ITT5YA2nqX5VIHe97Sjw2dvTlZ7b9GSp";

const volcWs = new WebSocket('wss://openspeech.bytedance.com/api/v1/tts/ws_binary', {
    headers: {
        Authorization: `Bearer;${ttsToken}`
    },
    skipUTF8Validation: true
});

volcWs.on('open', () => {
    console.log('Connected to Volcengine');
    const reqId = uuidv4();
    const requestJson = {
        app: {
            appid: ttsAppId,
            token: ttsToken,
            cluster: "volcano_tts"
        },
        user: { uid: "test_user" },
        audio: {
            voice_type: "zh_female_xueayi_saturn_bigtts",
            encoding: "mp3",
            speed_ratio: 1.0
        },
        request: {
            reqid: reqId,
            text: "测试语音合成",
            operation: "submit"
        }
    };

    const payload = zlib.gzipSync(JSON.stringify(requestJson));
    const header = Buffer.from([0x11, 0x10, 0x11, 0x00]);
    const sizeBuffer = Buffer.alloc(4);
    sizeBuffer.writeUInt32BE(payload.length, 0);
    const packet = Buffer.concat([header, sizeBuffer, payload]);
    volcWs.send(packet);
    console.log('Request sent');
});

volcWs.on('message', (data) => {
    const msgType = (data[1] >> 4) & 0x0F;
    const compression = data[2] & 0x0F;
    const headerSize = (data[0] & 0x0F) * 4;

    console.log('--- Message Received ---');
    console.log(`Total Length: ${data.length}`);
    console.log(`Header: ${data.slice(0, 4).toString('hex')}`);
    console.log(`MsgType: ${msgType.toString(16)}`);
    console.log(`Compression: ${compression}`);
    console.log(`Header Size: ${headerSize}`);

    if (msgType === 0xB) {
        console.log('Type: Audio Response');
        // Check bytes after header
        const afterHeader = data.slice(headerSize, headerSize + 16);
        console.log(`Bytes after header: ${afterHeader.toString('hex')}`);
        
        // Try to detect Size field
        // If the first 4 bytes look like a size (e.g. 00 00 XX XX), it's likely a size field.
        const sizeVal = data.readUInt32BE(headerSize);
        console.log(`UInt32 at offset ${headerSize}: ${sizeVal}`);

        // Try to detect Gzip
        // Gzip magic: 1f 8b
        // Check at offset headerSize
        if (data[headerSize] === 0x1f && data[headerSize+1] === 0x8b) {
            console.log('Gzip detected at offset ' + headerSize);
        }
        // Check at offset headerSize + 4
        if (data[headerSize+4] === 0x1f && data[headerSize+5] === 0x8b) {
            console.log('Gzip detected at offset ' + (headerSize + 4));
        }

        volcWs.close();
    } else if (msgType === 0xC) {
        console.log('Type: JSON Response');
    } else {
        console.log('Type: Other (' + msgType.toString(16) + ')');
    }
});

volcWs.on('error', (e) => {
    console.error('Error:', e);
});
