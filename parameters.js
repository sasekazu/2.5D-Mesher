//スライダで調整可能なグローバル変数

// スケーリング変数
var mmperpixel = 0.15;
// 輪郭粗さ
var minlen=15;

// 画像描画関係
var imgSc=1;
var dx;
var dy;
var dw;
var dh;



$(document).ready(function () {

	// 出力スケーリング変数mmperpixel
	$("#scaleSlider").slider({
		min: 0.05,
		max: 0.3,
		step: 0.01,
		value: mmperpixel,
		slide: function (event, ui) {
			mmperpixel = ui.value;
			document.getElementById('scaleSpan').innerHTML = mmperpixel;
		}
	});
	document.getElementById('scaleSpan').innerHTML=mmperpixel;

	// 輪郭粗さminlen
	$("#minlenSlider").slider({
		min: 5,
		max: 30,
		step: 5,
		value: minlen,
		slide: function (event, ui) {
			minlen = ui.value;
			document.getElementById('minlenSpan').innerHTML = minlen;
		}
	});
	document.getElementById('minlenSpan').innerHTML=minlen;

});