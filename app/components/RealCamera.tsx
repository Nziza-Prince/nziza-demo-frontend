import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SoilAnalysisLoading from './SoilAnalysisLoading';

// Import camera conditionally to avoid web issues
let Camera: any = null;
let CameraType: any = null;

try {
    const expoCamera = require('expo-camera');
    Camera = expoCamera.Camera;
    CameraType = expoCamera.CameraType;
} catch (error) {
    console.log('Expo Camera not available on this platform');
}

const { width, height } = Dimensions.get('window');

export default function RealCamera() {
    const router = useRouter();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const cameraRef = useRef<any>(null);
    
    // Animation refs for scanning effect
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const cornerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        (async () => {
            if (Camera && Platform.OS !== 'web') {
                // Mobile: Use Expo Camera
                const { status } = await Camera.requestCameraPermissionsAsync();
                setHasPermission(status === 'granted');
            } else if (Platform.OS === 'web') {
                // Web: Use Web Camera API
                try {
                    console.log('Requesting camera access...');
                    const mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: 'environment', // Use back camera if available
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    });
                    console.log('Camera access granted, setting up video...');
                    setStream(mediaStream);
                    setHasPermission(true);
                    
                    // Attach stream to video element with a small delay to ensure DOM is ready
                    setTimeout(() => {
                        if (videoRef.current) {
                            console.log('Attaching stream to video element...');
                            videoRef.current.srcObject = mediaStream;
                            videoRef.current.play().catch(e => console.error('Video play error:', e));
                        }
                    }, 100);
                } catch (error) {
                    console.error('Error accessing camera:', error);
                    setHasPermission(false);
                }
            }
        })();

        // Cleanup function
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Start scanning animations when scanning begins
    useEffect(() => {
        if (isScanning) {
            // Scanning line animation
            const scanAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(scanLineAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scanLineAnim, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            );

            // Corner pulse animation
            const cornerAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(cornerAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(cornerAnim, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );

            scanAnimation.start();
            cornerAnimation.start();

            return () => {
                scanAnimation.stop();
                cornerAnimation.stop();
            };
        }
    }, [isScanning]);

    const handleStartScanning = () => {
        console.log('Start scanning button pressed!');
        setIsScanning(true);
        
        // Simulate scanning for 8 seconds with animation
        setTimeout(() => {
            console.log('Scanning complete, starting analysis...');
            setIsScanning(false);
            setIsAnalyzing(true);
        }, 8000);
    };

    const handleAnalysisComplete = () => {
        router.push('/CropRecommendation');
    };

    const handleBack = () => {
        // Stop camera stream before going back
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        router.back();
    };

    // Web camera component with real video feed
    if (Platform.OS === 'web') {
        if (hasPermission === null) {
            return (
                <View style={styles.container}>
                    <Text style={styles.text}>Requesting camera permission...</Text>
                </View>
            );
        }

        if (hasPermission === false) {
            return (
                <View style={styles.container}>
                    <Ionicons name="camera-off" size={64} color="#ef4444" />
                    <Text style={styles.text}>No access to camera</Text>
                    <TouchableOpacity style={styles.button} onPress={handleBack}>
                        <Text style={styles.buttonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (isAnalyzing) {
            return (
                <SoilAnalysisLoading 
                    method="camera" 
                    onComplete={handleAnalysisComplete} 
                />
            );
        }

        return (
            <View style={styles.container}>
                {/* Real Web Camera View */}
                <View style={styles.webCameraContainer}>
                    <video
                        ref={videoRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: 1,
                        }}
                        autoPlay
                        playsInline
                        muted
                        onLoadedMetadata={() => console.log('Video metadata loaded')}
                        onCanPlay={() => console.log('Video can play')}
                        onError={(e) => console.error('Video error:', e)}
                    />
                    
                    {/* Debug info - remove this later */}
                    <View style={{
                        position: 'absolute',
                        top: 50,
                        left: 20,
                        right: 20,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 10,
                        borderRadius: 5,
                        zIndex: 10,
                    }}>
                        <Text style={{color: 'white', fontSize: 12}}>
                            Camera Status: {hasPermission === null ? 'Requesting...' : hasPermission ? 'Ready' : 'Denied'}
                        </Text>
                        <Text style={{color: 'white', fontSize: 12}}>
                            Stream: {stream ? 'Connected' : 'Not connected'}
                        </Text>
                        <Text style={{color: 'white', fontSize: 12}}>
                            Scanning: {isScanning ? 'YES' : 'NO'}
                        </Text>
                        <Text style={{color: 'white', fontSize: 12}}>
                            Analyzing: {isAnalyzing ? 'YES' : 'NO'}
                        </Text>
                    </View>
                    
                    {/* QR-Style Scanning Overlay */}
                    {isScanning && (
                        <View style={styles.webScanningOverlay}>
                            <View style={styles.webScanningFrame}>
                                {/* Corner Indicators with Animation */}
                                <Animated.View 
                                    style={[
                                        styles.cornerIndicator, 
                                        styles.topLeft,
                                        {
                                            opacity: cornerAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.7, 1],
                                            }),
                                        }
                                    ]} 
                                />
                                <Animated.View 
                                    style={[
                                        styles.cornerIndicator, 
                                        styles.topRight,
                                        {
                                            opacity: cornerAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.7, 1],
                                            }),
                                        }
                                    ]} 
                                />
                                <Animated.View 
                                    style={[
                                        styles.cornerIndicator, 
                                        styles.bottomLeft,
                                        {
                                            opacity: cornerAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.7, 1],
                                            }),
                                        }
                                    ]} 
                                />
                                <Animated.View 
                                    style={[
                                        styles.cornerIndicator, 
                                        styles.bottomRight,
                                        {
                                            opacity: cornerAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.7, 1],
                                            }),
                                        }
                                    ]} 
                                />
                                
                                {/* Animated Scanning Line */}
                                <Animated.View
                                    style={[
                                        styles.webScanningLine,
                                        {
                                            transform: [{
                                                translateY: scanLineAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0, height * 0.5 - 20],
                                                }),
                                            }],
                                        },
                                    ]}
                                />
                                
                                {/* Scanning Text */}
                                <Text style={styles.webScanningText}>Scanning Soil...</Text>
                                
                                {/* Scanning Progress */}
                                <View style={styles.scanningProgress}>
                                    <Text style={styles.scanningProgressText}>Analyzing soil composition</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Camera Controls */}
                    <View style={styles.webControls}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        
                        <View style={styles.centerControls}>
                            {!isScanning ? (
                                <TouchableOpacity 
                                    style={styles.scanButton} 
                                    onPress={handleStartScanning}
                                >
                                    <Ionicons name="camera" size={32} color="white" />
                                    <Text style={styles.scanButtonText}>START SCANNING</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.scanningIndicator}>
                                    <Text style={styles.scanningStatus}>Scanning...</Text>
                                </View>
                            )}
                        </View>
                        
                        <View style={styles.placeholder} />
                    </View>

                    {/* Instructions */}
                    {!isScanning && (
                        <View style={styles.webInstructions}>
                            <Text style={styles.webInstructionsTitle}>Point camera at soil</Text>
                            <Text style={styles.webInstructionsText}>
                                Position 6-12 inches above soil surface
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    }

    // Mobile: Use Expo Camera
    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Requesting camera permission...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <Ionicons name="camera-off" size={64} color="#ef4444" />
                <Text style={styles.text}>No access to camera</Text>
                <TouchableOpacity style={styles.button} onPress={handleBack}>
                    <Text style={styles.buttonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isAnalyzing) {
        return (
            <SoilAnalysisLoading 
                method="camera" 
                onComplete={handleAnalysisComplete} 
            />
        );
    }

    return (
        <View style={styles.container}>
            {/* Mobile Camera View */}
            <Camera 
                style={styles.camera} 
                type={CameraType.back}
                ref={cameraRef}
            >
                {/* QR-Style Scanning Overlay */}
                {isScanning && (
                    <View style={styles.scanningOverlay}>
                        <View style={styles.scanningFrame}>
                            {/* Corner Indicators with Animation */}
                            <Animated.View 
                                style={[
                                    styles.cornerIndicator, 
                                    styles.topLeft,
                                    {
                                        opacity: cornerAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.7, 1],
                                        }),
                                    }
                                ]} 
                            />
                            <Animated.View 
                                style={[
                                    styles.cornerIndicator, 
                                    styles.topRight,
                                    {
                                        opacity: cornerAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.7, 1],
                                        }),
                                    }
                                ]} 
                            />
                            <Animated.View 
                                style={[
                                    styles.cornerIndicator, 
                                    styles.bottomLeft,
                                    {
                                        opacity: cornerAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.7, 1],
                                        }),
                                    }
                                ]} 
                            />
                            <Animated.View 
                                style={[
                                    styles.cornerIndicator, 
                                    styles.bottomRight,
                                    {
                                        opacity: cornerAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.7, 1],
                                        }),
                                    }
                                ]} 
                            />
                            
                            {/* Animated Scanning Line */}
                            <Animated.View
                                style={[
                                    styles.scanningLine,
                                    {
                                        transform: [{
                                            translateY: scanLineAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, height * 0.5 - 20],
                                            }),
                                        }],
                                    },
                                ]}
                            />
                            
                            {/* Scanning Text */}
                            <Text style={styles.scanningText}>Scanning Soil...</Text>
                            
                            {/* Scanning Progress */}
                            <View style={styles.scanningProgress}>
                                <Text style={styles.scanningProgressText}>Analyzing soil composition</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Camera Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    
                    <View style={styles.centerControls}>
                        {!isScanning ? (
                            <TouchableOpacity 
                                style={styles.scanButton} 
                                onPress={handleStartScanning}
                            >
                                <Ionicons name="camera" size={32} color="white" />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.scanningIndicator}>
                                <Text style={styles.scanningStatus}>Scanning...</Text>
                            </View>
                        )}
                    </View>
                    
                    <View style={styles.placeholder} />
                </View>

                {/* Instructions */}
                {!isScanning && (
                    <View style={styles.instructions}>
                        <Text style={styles.instructionsTitle}>Point camera at soil</Text>
                        <Text style={styles.instructionsText}>
                            Position 6-12 inches above soil surface
                        </Text>
                    </View>
                )}
            </Camera>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    text: {
        color: 'white',
        fontSize: 18,
        textAlign: 'center',
        marginTop: 20,
    },
    button: {
        backgroundColor: '#0B4D26',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Web camera styles
    webCameraContainer: {
        flex: 1,
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
    },
    webScanningOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    webScanningFrame: {
        width: width * 0.8,
        height: height * 0.5,
        borderWidth: 2,
        borderColor: '#10b981',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    webScanningLine: {
        position: 'absolute',
        width: '80%',
        height: 3,
        backgroundColor: '#10b981',
        borderRadius: 2,
        top: '50%',
        left: '10%',
    },
    webScanningText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
    },
    scanningProgress: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    scanningProgressText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    webControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 20,
    },
    webInstructions: {
        position: 'absolute',
        top: 100,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    webInstructionsTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    webInstructionsText: {
        color: 'white',
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.9,
    },
    // Mobile camera styles
    scanningOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanningFrame: {
        width: width * 0.8,
        height: height * 0.5,
        borderWidth: 2,
        borderColor: '#10b981',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    cornerIndicator: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderWidth: 3,
        borderColor: '#10b981',
    },
    topLeft: {
        top: -2,
        left: -2,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: -2,
        right: -2,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: -2,
        left: -2,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: -2,
        right: -2,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    scanningLine: {
        position: 'absolute',
        width: '80%',
        height: 3,
        backgroundColor: '#10b981',
        borderRadius: 2,
        top: '50%',
        left: '10%',
    },
    scanningText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
    },
    scanningProgress: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    scanningProgressText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    controls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 20,
    },
    backButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 12,
        borderRadius: 25,
    },
    centerControls: {
        flex: 1,
        alignItems: 'center',
    },
    scanButton: {
        backgroundColor: '#10b981',
        padding: 20,
        borderRadius: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120,
    },
    scanButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 5,
    },
    scanningIndicator: {
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    scanningStatus: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 60,
    },
    instructions: {
        position: 'absolute',
        top: 100,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    instructionsTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    instructionsText: {
        color: 'white',
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.9,
    },
}); 