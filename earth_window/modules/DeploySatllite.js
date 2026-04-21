import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.module.js";
import { scene } from "../SatDeckWindow.js";


window.last_sat_id = -1;
window.data_ready = false;
window.cur_slot = 0;
const box_time = document.getElementById('hudTime');
const btnPlay = document.getElementById('btnPlay');
const btnPause = document.getElementById('btnPause');
const btnReset = document.getElementById('btnReset');
const IconPlay = document.getElementById('IconPlay');
const imgPlay = '../../../images/start.png';
const imgPause = '../../../images/pause.png'
const earthLoader = document.getElementById('earth_loader');
const networkContainer = document.getElementById('myNetwork');

export function CreateSatelliteMarker() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, 'red'); // 在这里改颜色
    gradient.addColorStop(1, 'red');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(size, size);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, sizeAttenuation: true });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.06, 0.06, 1); // 这里改大小
    scene.add(sprite);

    return sprite; // return it so we can move it later
}




export const mySatellite = await CreateSatelliteMarker();

// 动画控制变量
let animationInterval = null;
let currentIndex = 0;
let positionsData = [];

async function load_data() {
    try {
        earthLoader.classList.remove('hidden');
        let response = await fetch(`http://localhost:8000/api/sat_pos?sat_id=${sat_id}`);
        let result = await response.json();

        if (!result.success) {
            console.error('获取pos数据失败:', result.error);
            return;
        }
        positionsData = result.data;

        response = await fetch(`http://localhost:8000/api/network?slot_id=${cur_slot}`);
        result = await response.json();
        if (!result.success) {
            console.error('获取network数据失败:', result.error);
            return;
        }
        let nodes = new vis.DataSet(
            result.nodes.map(n => ({ id: n.id, label: n.name, title: '' }))
        );
        let edges = new vis.DataSet(
            result.edges.map(e => ({ from: e.from, to: e.to, label: e.rate.toFixed(2) + 'Mbps', value: e.rate }))
        );
        let data = { nodes: nodes, edges: edges };
        var options = {
            nodes: {
                shape: 'dot',
                size: 20,
                font: { size: 12, color: 'white' }
            },
            edges: {
                arrows: { to: true },
                font: { size: 12, color: 'white' }
            },
            physics: {
                solver: 'barnesHut',
                barnesHut: {
                    gravitationalConstant: -8000,  // 增大负值，斥力更强
                    centralGravity: 0.1,           // 减小中心引力
                    springLength: 200,              // 弹簧长度
                    springConstant: 0.04,           // 弹簧常数
                    damping: 0.09,
                    avoidOverlap: 0.5              // 避免重叠（0-1之间）
                },
                stabilization: { iterations: 500 }
            },
            interaction: { hover: true }
        };

        new vis.Network(networkContainer, data, options);


        earthLoader.classList.add('hidden');
    } catch (error) {
        console.error('请求失败:', error);
    }
}





// 更新卫星位置并显示时间
function updateSatellitePosition(index) {
    if (!positionsData[index]) return;

    const pos = positionsData[index];
    const earthRadiusKm = 6378000; // 地球半径（m）
    const nx = pos.eci_x / earthRadiusKm;
    const ny = pos.eci_y / earthRadiusKm;
    const nz = pos.eci_z / earthRadiusKm;
    mySatellite.position.set(nx, ny, nz);

    box_time.textContent = pos.time;
    console.log(`index: ${index}, time: ${pos.time}`);
}



// 开始动画
export async function startAnimation() {
    TogglePlayIcon();
    if (!data_ready || sat_id != last_sat_id) {
        await load_data();
        data_ready = true;
        last_sat_id = sat_id;
    }
    // 清除已存在的定时器
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }

    function playNext() {
        if (cur_slot >= positionsData.length) {
            // 播放完成，自动暂停
            console.log('播放完成，自动暂停');
            stopAnimation();
            cur_slot = 0;
            return;
        }

        updateSatellitePosition(cur_slot);
        console.log(`playing ${cur_slot}`)
        cur_slot++;
    }

    // 立即播放第一帧
    playNext();
    // 设置定时器继续播放后续帧
    animationInterval = setInterval(playNext, 1000);
}

// 停止动画
function stopAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;

    }
    TogglePlayIcon();
    console.log('pause');
}

// 重置动画
export function resetAnimation() {
    cur_slot = 0;
    box_time.textContent = '';
    IconPlay.src = imgPlay;
    window.isPlaying = false;
    console.log('reset');
}






function TogglePlayIcon() {
    isPlaying = !isPlaying;
    if (isPlaying) {
        IconPlay.src = imgPause;
        btnPlay.onmouseenter = (e) => showTooltip(e, 'pause');
    } else {
        IconPlay.src = imgPlay;
        btnPlay.onmouseenter = (e) => showTooltip(e, 'play');
    }
    // 如果鼠标正在按钮上，立即更新 tooltip 文本
    if (btnPlay.matches(':hover')) {
        // 直接调用 showTooltip 更新文本
        showTooltip({ target: btnPlay }, isPlaying ? 'pause' : 'play');
    }
}




document.addEventListener('DOMContentLoaded', () => {
    window.isPlaying = false;

    function toggleAnimation() {
        if (window.sat_id == null) {
            alert('invalid sat_id');
            return;
        }
        if (isPlaying) {
            stopAnimation();
        } else {
            startAnimation();
        }

    }

    btnPlay.addEventListener('click', toggleAnimation);

    btnReset.addEventListener('click', resetAnimation);
});