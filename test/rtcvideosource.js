/* globals gc */
'use strict';

const test = require('tape');

const RTCPeerConnection = require('..').RTCPeerConnection;
const RTCVideoSource = require('..').RTCVideoSource;

const width = 640;
const height = 480;
const sizeOfLuminancePlane = width * height;
const sizeOfChromaPlane = sizeOfLuminancePlane / 4;
const byteLength
  = sizeOfLuminancePlane  // Y
  + sizeOfChromaPlane     // U
  + sizeOfChromaPlane;    // V

const data = new Uint8ClampedArray(byteLength);

const frame = {
  width,
  height,
  data
};

function tick() {
  return new Promise(resolve => setTimeout(resolve));
}

function printSource(source) {
  console.log(source);
}

function printTrack(track) {
  console.log(track);
}

test('simple usage', async t => {
  await (async () => {
    const source = new RTCVideoSource();
    printSource(source);
    await tick();

    source.onFrame(frame);
    await tick();

    const track = source.createTrack();
    printTrack(track);
    await tick();

    const clonedTrack = track.clone();
    printTrack(clonedTrack);
    await tick();

    source.onFrame(frame);
    await tick();

    track.stop();
    printTrack(track);
    await tick();

    source.onFrame(frame);
    await tick();

    clonedTrack.stop();
    printTrack(clonedTrack);
    await tick();

    source.onFrame(frame);
    await tick();
  })();

  if (typeof gc === 'function') {
    gc();
  }

  t.end();
});

test('getStats()', async t => {
  const pc1 = new RTCPeerConnection();
  const pc2 = new RTCPeerConnection();

  [[pc1, pc2], [pc2, pc1]].forEach(([pcA, pcB]) => {
    pcA.onicecandidate = ({ candidate }) => {
      if (candidate) {
        pcB.addIceCandidate(candidate);
      }
    };
  });

  const source = new RTCVideoSource();
  const track = source.createTrack();
  pc1.addTrack(track);

  const offer = await pc1.createOffer();
  await pc1.setLocalDescription(offer);
  await pc2.setRemoteDescription(offer);
  const answer = await pc2.createAnswer();
  await pc2.setLocalDescription(answer);
  await pc1.setRemoteDescription(answer);

  let stats;
  do {
    source.onFrame(frame);
    const report = await pc1.getStats();
    stats = [...report.values()]
      .find(stats => stats.trackIdentifier === track.id
                  && stats.frameWidth > 0
                  && stats.frameHeight > 0);
  } while (!stats);

  t.equal(stats.frameWidth, frame.width);
  t.equal(stats.frameHeight, frame.height);

  track.stop();
  pc1.close();
  pc2.close();

  t.end();
});

test('RTCVideoFrame', t => {
  const source = new RTCVideoSource();

  try {
    source.onFrame(frame);
    t.pass();
  } catch (error) {
    t.fail(error);
  } finally {
    t.end();
  }
});