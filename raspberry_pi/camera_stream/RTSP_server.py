import gi

gi.require_version('Gst', '1.0')
gi.require_version('GstRtspServer', '1.0')

from gi.repository import Gst
from gi.repository import GstRtspServer
from gi.repository import GLib

# ============================================
# Initialize GStreamer
# ============================================

Gst.init(None)


# ============================================
# RTSP MEDIA FACTORY
# ============================================

class SkyRangerFactory(GstRtspServer.RTSPMediaFactory):

    def __init__(self):

        super(SkyRangerFactory, self).__init__()

        # Allow multiple clients
        self.set_shared(True)

        # Reduce latency
        self.set_latency(0)

    def do_create_element(self, url):

        pipeline = """
            v4l2src device=/dev/video8 do-timestamp=true !
            image/jpeg,width=640,height=480,framerate=25/1 !
            jpegdec !
            videoconvert !
            x264enc tune=zerolatency speed-preset=ultrafast bitrate=1000 !
            h264parse !
            rtph264pay config-interval=1 name=pay0 pt=96
        """

        return Gst.parse_launch(pipeline)


# ============================================
# RTSP SERVER
# ============================================

class SkyRangerRTSPServer:

    def __init__(self):

        self.server = GstRtspServer.RTSPServer()

        # Bind to all interfaces
        self.server.set_address("0.0.0.0")

        # RTSP Port
        self.server.set_service("8554")

        # Create media factory
        factory = SkyRangerFactory()

        # Mount stream endpoint
        mounts = self.server.get_mount_points()

        mounts.add_factory("/fpv", factory)

        # Attach server
        self.server.attach(None)

        print("\n===================================")
        print(" SkyRanger RTSP FPV Server Running ")
        print("===================================")

        print("\nRTSP URL:")
        print("rtsp://10.39.201.80:8554/fpv\n")


# ============================================
# MAIN
# ============================================

if __name__ == "__main__":

    server = SkyRangerRTSPServer()

    loop = GLib.MainLoop()

    loop.run()