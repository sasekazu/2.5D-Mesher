﻿// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />
/// <reference path="outline.js" />
/// <reference path="delaunay.js" />


////////////////////////////////////////////////////////////
// Mesh25dクラスの定義
////////////////////////////////////////////////////////////
	
function Mesh25d(initpos, tri, thickness){
	this.pos2d = numeric.clone(initpos);      // 節点現在位置
	this.initpos = numeric.clone(initpos);  // 節点初期位置

	this.posNum2d = this.pos2d.length;

	this.tri = numeric.clone(tri); // 三角形要素の節点リスト
	this.nodeToTri = [];		// ノードに接続している三角形要素リスト
	this.surEdge = [];			// 表面エッジリスト
	this.surToTri = [];		// 表面エッジ-対応する三角形要素リスト
	this.triToSur = [];		// 三角形要素-対応する表面エッジリスト
	this.sndToSur = [];	// 表面頂点に接続している表面エッジリスト

	this.makeSurface();

	this.thickness = thickness;
	this.pos;
	this.normal;
	this.make3d();

	this.stl;
	this.makeStl();

}


Mesh25d.prototype.makeSurface = function(){
	// nodeToTriの作成
	this.nodeToTri = new Array(this.posNum2d);
	for(var i=0; i<this.posNum2d; i++)
		this.nodeToTri[i] = [];
	for(var i = 0; i < this.tri.length; i++) 
		for(var vert = 0; vert < 3; vert++) 
			this.nodeToTri[this.tri[i][vert]].push(i);

	// surEdge, surToTri, triToSur, sndToSurの作成
	// 四面体についてのループを回し、
	// 四面体の各エッジが現在着目している四面体以外の四面体に共有されているかどうかを調べる
	// (エッジの頂点番号からnodeToTetを参照すれば判定できる)
	// 共有されていなければそれは表面エッジであるとみなす
	var buf = [[0,1,2],[1,2,0],[2,0,1]];
	var n1,n2,n3;	// bufに対応する頂点番号
	var nt1, nt2; // nodeToTetの一次格納変数
	var shareFlag;
	var surCount = 0;
	var v1,v2;	
	this.triToSur = new Array(this.tri.length);
	for(var i = 0; i < this.tri.length; i++) {
		this.triToSur[i] = [];
	}
	for(var i = 0; i < this.tri.length; i++) {
		for(var edg = 0; edg < 3; edg++) {
			shareFlag = false;
			n1 = this.tri[i][buf[edg][0]];
			n2 = this.tri[i][buf[edg][1]];
			nt1 = this.nodeToTri[n1];
			nt2 = this.nodeToTri[n2];
			for(var j = 0; j < nt1.length; j++) {
				for(var k = 0; k < nt2.length; k++) {
					if(shareFlag)break;
					if(nt1[j] === nt2[k] && nt1[j] !== i) {
						shareFlag = true;
					}
				}
			}
			if(!shareFlag) {
				// surEdgeに格納する頂点番号の順番が反時計回りになるようにする
				n3 = this.tri[i][buf[edg][2]];
				v1 = numeric.sub(this.initpos[n1],this.initpos[n3]);
				v2 = numeric.sub(this.initpos[n2],this.initpos[n3]);
				if(v1[0]*v2[1]-v1[1]*v2[0]>0)
					this.surEdge.push([this.tri[i][buf[edg][0]], this.tri[i][buf[edg][1]]]);
				else
					this.surEdge.push([this.tri[i][buf[edg][1]], this.tri[i][buf[edg][0]]]);
				this.surToTri.push(i);
				this.triToSur[i].push(surCount);
				++surCount;
			}
		}
	}
}


Mesh25d.prototype.make3d = function () {
	// pos3dの作成
	this.pos = new Array(this.posNum2d*2);
	for(var i=0; i<this.posNum2d; i++){
		this.pos[i] = new Array(3);
		this.pos[i][0] = this.pos2d[i][0];
		this.pos[i][1] = 500-this.pos2d[i][1];
		this.pos[i][2] = this.thickness;
	}
	for(var i=0; i<this.posNum2d; i++){
		this.pos[this.posNum2d+i] = new Array(3);
		this.pos[this.posNum2d+i][0] = this.pos[i][0];
		this.pos[this.posNum2d+i][1] = this.pos[i][1];
		this.pos[this.posNum2d+i][2] = 0;
	}
	// triの作成
	var triNum2d = this.tri.length;
	for(var i = 0; i < triNum2d; i++) {
		var tritmp = new Array(3);
		tritmp[0] = this.tri[i][0] + this.posNum2d;
		tritmp[1] = this.tri[i][2] + this.posNum2d;
		tritmp[2] = this.tri[i][1] + this.posNum2d;
		this.tri.push(tritmp);
	}
	// 側面のtriの作成
	for(var i = 0; i < this.surEdge.length; i++) {
		var tritmp1 = new Array(3);
		tritmp1[0] = this.surEdge[i][0];
		tritmp1[1] = this.surEdge[i][1];
		tritmp1[2] = this.surEdge[i][0] + this.posNum2d;
		this.tri.push(tritmp1);
		var tritmp2 = new Array(3);
		tritmp2[0] = this.surEdge[i][0] + this.posNum2d;
		tritmp2[2] = this.surEdge[i][1] + this.posNum2d;
		tritmp2[1] = this.surEdge[i][1];
		this.tri.push(tritmp2);
	}

	this.normal = new Array(this.tri.length);
	for(var i=0; i<triNum2d; i++){
		this.normal[i] = [0,0,1];
	}
	for(var i=0; i<triNum2d; i++){
		this.normal[i+triNum2d] = [0,0,-1];
	}
	for(var i=0; i<this.tri.length-2*triNum2d; i++){
		this.normal[i+triNum2d*2] = [1,1,1];
	}
}


Mesh25d.prototype.makeStl = function () {
	this.stl = "solid mesh2.5d\n";
	for(var i = 0; i < this.tri.length; i++) {
		this.stl += "facet normal" + " " + this.normal[i][0] + " " + this.normal[i][1]  + " " + this.normal[i][2] + "\n";
		this.stl += "outer loop\n";
		this.stl += "vertex " + this.pos[this.tri[i][0]][0] + " " + this.pos[this.tri[i][0]][1] + " " + this.pos[this.tri[i][0]][2] + "\n";
		this.stl += "vertex " + this.pos[this.tri[i][1]][0] + " " + this.pos[this.tri[i][1]][1] + " " + this.pos[this.tri[i][1]][2] + "\n";
		this.stl += "vertex " + this.pos[this.tri[i][2]][0] + " " + this.pos[this.tri[i][2]][1] + " " + this.pos[this.tri[i][2]][2] + "\n";
		this.stl += "endloop\n";
		this.stl += "endfacet\n";
	}
	this.stl += "endsolid mesh2.5d\n";
}