/**
 * @author Matas Ubarevicius / http://fucture.org/
*/

/**
Copyright (c) 2015 Fucture

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

THREE.FuctureKinectSkeletonHelper = function () {
    var fk = this;

    // public interface
    fk.getJoints = getJoints;
    fk.generateSkeleton = generateSkeleton;
    fk.updateSkeleton = updateSkeleton;
    fk.configure = configure;
    fk.scale = 100;
    fk.debugAxisLength = 0.01;
    fk.cameraHeight = 0.735;
    fk.drawDebugBoxes = true;
    fk.drawDebugLines = false;
    fk.drawDebugJoints = true;
    fk.jitterFilterEnabled = true;

    // private properties, possibly could be made public
    var axisXGeometry = new THREE.Geometry();
    var axisYGeometry = new THREE.Geometry();
    var axisZGeometry = new THREE.Geometry();
    var boneGeometry = new THREE.Geometry();
    var boneLineGeometry = new THREE.Geometry();
    var jointGeometry = new THREE.Geometry();
    var boneBoxes = [];
    var boneLines = [];

    var axisXMat = new THREE.LineBasicMaterial({ color: 0xff0000, lineWidth: 1 });
    var axisYMat = new THREE.LineBasicMaterial({ color: 0x00ff00, lineWidth: 1 });
    var axisZMat = new THREE.LineBasicMaterial({ color: 0x0000ff, lineWidth: 1 });
    var boneMat = new THREE.LineBasicMaterial({ color: 0x00ffff, lineWidth: 10 });
    var jointMaterial = new THREE.PointCloudMaterial({ size: 10, sizeAttenuation: false, color: 0xffff00 });

    var joints = [];
    var jointNumberConstant;

    var jitterFilterCounters = [];
    for (var i = 0; i < 25; i++) {
        jitterFilterCounters.push(0);
    }

    var averagePos = [25];
    var averageBucketJointPositions = [];
    var averageBucketJointOrientations = [];
    for (var i = 0; i < 25; i++) {
        averageBucketJointPositions.push([]);
        averageBucketJointOrientations.push([]);
    }

    return fk;

    function configure(config) {
        fk.scale = config.scale;
        fk.debugAxisLength = config.debugAxisLength;
        fk.cameraHeight = config.cameraHeight;
        fk.drawDebugBoxes = config.drawDebugBoxes;
        fk.drawDebugLines = config.drawDebugLines;
        fk.drawDebugJoints = config.drawDebugJoints;
        fk.jitterFilterEnabled = config.jitterFilterEnabled;
    }

    function getJoints(body, trackingState) {
        var jointInfo = {};

        Iterable.forEach(body.joints, jointIterator);
        function jointIterator(keyValuePair) {
            var jointType = keyValuePair.key;
            var joint = keyValuePair.value;
            var isTracked = joint.trackingState === trackingState.tracked;

            if (isTracked) {
                // simple jitter filter
                if (fk.jitterFilterEnabled) {
                    if (averageBucketJointPositions[jointType].length !== 10) {
                        averageBucketJointPositions[jointType].push(joint.position);
                    } else {
                        averageBucketJointPositions[jointType].shift();
                        averageBucketJointPositions[jointType].push(joint.position);
                    }

                    var sumPosition = { x: 0, y: 0, z: 0 };
                    for (var i = 0; i < averageBucketJointPositions[jointType].length; i++) {
                        sumPosition.x += averageBucketJointPositions[jointType][i].x;
                        sumPosition.y += averageBucketJointPositions[jointType][i].y;
                        sumPosition.z += averageBucketJointPositions[jointType][i].z;
                    }
                    sumPosition.x /= averageBucketJointPositions[jointType].length;
                    sumPosition.y /= averageBucketJointPositions[jointType].length;
                    sumPosition.z /= averageBucketJointPositions[jointType].length;
                    jointInfo[jointType] = { position: sumPosition, jointType: joint.jointType };
                } else {
                    jointInfo[jointType] = { position: joint.position, jointType: joint.jointType };
                }

            }
        }

        Iterable.forEach(body.jointOrientations, jointOrientationIterator);
        function jointOrientationIterator(keyValuePair) {
            var jointType = keyValuePair.key;
            var joint = keyValuePair.value;

            // simple jitter filter
            if (fk.jitterFilterEnabled) {
                if (averageBucketJointOrientations[jointType].length !== 10) {
                    averageBucketJointOrientations[jointType].push(joint.orientation);
                } else {
                    averageBucketJointOrientations[jointType].shift();
                    averageBucketJointOrientations[jointType].push(joint.orientation);
                }

                var sumOrientation = { x: 0, y: 0, z: 0, w: 0 };
                for (var i = 0; i < averageBucketJointOrientations[jointType].length; i++) {
                    sumOrientation.x += averageBucketJointOrientations[jointType][i].x;
                    sumOrientation.y += averageBucketJointOrientations[jointType][i].y;
                    sumOrientation.z += averageBucketJointOrientations[jointType][i].z;
                    sumOrientation.w += averageBucketJointOrientations[jointType][i].w;
                }

                sumOrientation.x /= averageBucketJointOrientations[jointType].length;
                sumOrientation.y /= averageBucketJointOrientations[jointType].length;
                sumOrientation.z /= averageBucketJointOrientations[jointType].length;
                sumOrientation.w /= averageBucketJointOrientations[jointType].length;

                if (jointInfo[jointType]) {
                    jointInfo[jointType].orientation = sumOrientation;
                } else {
                    jointInfo[jointType] = { orientation: sumOrientation };
                }
            } else {
                if (jointInfo[jointType]) {
                    jointInfo[jointType].orientation = joint.orientation;
                } else {
                    jointInfo[jointType] = { orientation: joint.orientation };
                }
            }
        }
        return jointInfo;
    }

    // scale 1000 means mm, scale 100 cm
    function generateSkeleton(scene, jointNumber, jointInfoForDrawing, scale, debugAxisLength) {
        fk.scale = scale;
        fk.debugAxisLength = debugAxisLength;
        fk.cameraHeight *= fk.scale;

        for (var i = 0; i < jointNumber; i++) {
            var joint = new THREE.Object3D();

            if (jointInfoForDrawing && jointInfoForDrawing[i]) {
                joint.position.x = jointInfoForDrawing[i].position.x * scale;
                joint.position.y = jointInfoForDrawing[i].position.z * scale;
                joint.position.z = jointInfoForDrawing[i].position.y * scale;
            }

            jointNumberConstant = jointNumber;

            joints.push(joint);
            scene.add(joint);
            jointGeometry.vertices.push(joint.position);

            var xPoint = new THREE.Vector3(debugAxisLength, 0, 0);
            xPoint.applyQuaternion(joints[i].quaternion);
            xPoint.add(joints[i].position);
            axisXGeometry.vertices.push(joint.position, xPoint);

            var yAxisMat = new THREE.LineBasicMaterial({ color: 0x0000ff, lineWidth: 1 });
            var yPoint = new THREE.Vector3(0, debugAxisLength, 0);
            yPoint.applyQuaternion(joints[i].quaternion);
            yPoint.add(joints[i].position);
            axisYGeometry.vertices.push(joint.position, yPoint);

            var zAxisMat = new THREE.LineBasicMaterial({ color: 0x00ff00, lineWidth: 1 });
            var zPoint = new THREE.Vector3(0, 0, debugAxisLength);
            zPoint.applyQuaternion(joints[i].quaternion);
            zPoint.add(joints[i].position);
            axisZGeometry.vertices.push(joint.position, zPoint);

            boneGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
            boneLineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
        }

        var group = new THREE.Object3D();//create an empty container
        for (var i = 0; i < 24; i++) {
            // make boxes for bones
            var boxBoneGeometry;
            // is head
            if (i == 11) {
                boxBoneGeometry = new THREE.BoxGeometry(10, 10, 1);
            }
            else {
                boxBoneGeometry = new THREE.BoxGeometry(5, 5, 1);
            }
            var boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00f273 });
            var box = new THREE.Mesh(boxBoneGeometry, boxMaterial);
            boneBoxes.push(box);
            group.add(box);
        }
        scene.add(group);

        var axisXLines = new THREE.Line(axisXGeometry, axisXMat, THREE.LinePieces);
        scene.add(axisXLines);
        var axisYLines = new THREE.Line(axisYGeometry, axisYMat, THREE.LinePieces);
        scene.add(axisYLines);
        var axisZLines = new THREE.Line(axisZGeometry, axisZMat, THREE.LinePieces);
        scene.add(axisZLines);

        var boneLines = new THREE.Line(boneLineGeometry, boneMat, THREE.LinePieces);
        scene.add(boneLines);

        var jointParticles = new THREE.PointCloud(jointGeometry, jointMaterial);
        scene.add(jointParticles);
    }

    function updateSkeleton(jointInfoForDrawing, jointType) {
        if (jointInfoForDrawing) {
            for (var j = 0; j < jointNumberConstant; j++) {
                if (jointInfoForDrawing && jointInfoForDrawing[j] && jointInfoForDrawing[j].position) {
                    joints[j].position.x = jointInfoForDrawing[j].position.x * fk.scale;
                    joints[j].position.y = jointInfoForDrawing[j].position.z * fk.scale;
                    joints[j].position.z = (jointInfoForDrawing[j].position.y + fk.cameraHeight / fk.scale) * fk.scale;
                }
                if (jointInfoForDrawing && jointInfoForDrawing[j] && jointInfoForDrawing[j].orientation) {
                    joints[j].quaternion.x = jointInfoForDrawing[j].orientation.x;
                    joints[j].quaternion.y = jointInfoForDrawing[j].orientation.y;
                    joints[j].quaternion.z = jointInfoForDrawing[j].orientation.z;
                    joints[j].quaternion.w = jointInfoForDrawing[j].orientation.w;
                }
                if (fk.drawDebugJoints) {
                    var xPoint = new THREE.Vector3(fk.debugAxisLength, 0, 0);
                    xPoint.applyQuaternion(joints[j].quaternion);
                    xPoint.add(joints[j].position);
                    axisXGeometry.vertices[j * 2 + 0] = joints[j].position;
                    axisXGeometry.vertices[j * 2 + 1] = xPoint;

                    var yPoint = new THREE.Vector3(0, fk.debugAxisLength, 0);
                    yPoint.applyQuaternion(joints[j].quaternion);
                    yPoint.add(joints[j].position);
                    axisYGeometry.vertices[j * 2 + 0] = joints[j].position;
                    axisYGeometry.vertices[j * 2 + 1] = yPoint;

                    var zPoint = new THREE.Vector3(0, 0, fk.debugAxisLength);
                    zPoint.applyQuaternion(joints[j].quaternion);
                    zPoint.add(joints[j].position);
                    axisZGeometry.vertices[j * 2 + 0] = joints[j].position;
                    axisZGeometry.vertices[j * 2 + 1] = zPoint;
                }
            }
            updateBones(jointType);
        }

        if (fk.drawDebugJoints) {
            jointGeometry.verticesNeedUpdate = true;
            axisXGeometry.verticesNeedUpdate = true;
            axisYGeometry.verticesNeedUpdate = true;
            axisZGeometry.verticesNeedUpdate = true;
        }

        boneGeometry.verticesNeedUpdate = true;
        boneLineGeometry.verticesNeedUpdate = true;
    }

    function mapSkeletonToBoneBox(index, jointTypeFrom, jointTypeTo, vertices, verticesLine, jointDistance) {
        if (fk.drawDebugBoxes) {
            var boneBox = boneBoxes[index];
            var pointInBetween = getPointInBetweenByPerc(joints[jointTypeFrom].position, joints[jointTypeTo].position, 0.5);
            boneBox.lookAt(joints[jointTypeTo].position);
            boneBox.position.x = pointInBetween.x;
            boneBox.position.y = pointInBetween.y;
            boneBox.position.z = pointInBetween.z;
            boneBox.scale.z = joints[jointTypeFrom].position.distanceTo(joints[jointTypeTo].position) - jointDistance;
            boneBox.geometry.verticesNeedUpdate = true;
        }
        if (fk.drawDebugLines) {
            if (index !== 0) {
                verticesLine[index * 2] = joints[jointTypeFrom].position;
                verticesLine[index * 2 + 1] = joints[jointTypeTo].position;
            } else {
                verticesLine[0] = joints[jointTypeFrom].position;
                verticesLine[1] = joints[jointTypeTo].position;
            }
        }
        if (fk.drawDebugJoints) {
            if (index !== 0) {
                vertices[index * 2] = joints[jointTypeFrom];
                vertices[index * 2 + 1] = joints[jointTypeTo];
            } else {
                vertices[0] = joints[jointTypeFrom];
                vertices[1] = joints[jointTypeTo];
            }
        }
    }

    function updateBones(jointType) {
        var vertices = boneGeometry.vertices;
        var verticesLine = boneLineGeometry.vertices;
        var jointDistance = 10;

        // left leg
        mapSkeletonToBoneBox(0, jointType.footLeft, jointType.ankleLeft, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(1, jointType.ankleLeft, jointType.kneeLeft, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(2, jointType.kneeLeft, jointType.hipLeft, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(3, jointType.hipLeft, jointType.spineBase, vertices, verticesLine, jointDistance);

        // right leg               
        mapSkeletonToBoneBox(4, jointType.footRight, jointType.ankleRight, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(5, jointType.ankleRight, jointType.kneeRight, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(6, jointType.kneeRight, jointType.hipRight, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(7, jointType.hipRight, jointType.spineBase, vertices, verticesLine, jointDistance);

        // spine - head                    
        mapSkeletonToBoneBox(8, jointType.spineBase, jointType.spineMid, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(9, jointType.spineMid, jointType.spineShoulder, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(10, jointType.spineShoulder, jointType.neck, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(11, jointType.neck, jointType.head, vertices, verticesLine, jointDistance);

        // right hand            
        mapSkeletonToBoneBox(12, jointType.handTipRight, jointType.handRight, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(13, jointType.thumbRight, jointType.handRight, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(14, jointType.handRight, jointType.wristRight, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(15, jointType.wristRight, jointType.elbowRight, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(16, jointType.elbowRight, jointType.shoulderRight, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(17, jointType.shoulderRight, jointType.spineShoulder, vertices, verticesLine, jointDistance);

        // left hand                       
        mapSkeletonToBoneBox(18, jointType.handTipLeft, jointType.handLeft, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(19, jointType.thumbLeft, jointType.handLeft, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(20, jointType.handLeft, jointType.wristLeft, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(21, jointType.wristLeft, jointType.elbowLeft, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(22, jointType.elbowLeft, jointType.shoulderLeft, vertices, verticesLine, jointDistance);
        mapSkeletonToBoneBox(23, jointType.shoulderLeft, jointType.spineShoulder, vertices, verticesLine, jointDistance);
    }

    function getPointInBetweenByPerc(pointA, pointB, percentage) {
        var dir = pointB.clone().sub(pointA);
        var len = dir.length();
        dir = dir.normalize().multiplyScalar(len * percentage);
        return pointA.clone().add(dir);
    }

};