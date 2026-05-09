import gi

gi.require_version('Gst', '1.0')
gi.require_version('GstRtspServer', '1.0')

from gi.repository import Gst
from gi.repository import GstRtspServer
from gi.repository import GLib

# Initialize GStreamer
Gst.init(None)


class SkyRangerFactory(GstRtspServer.RTSPMediaFactory):

    def __init__(self):

        super(SkyRangerFactory, self).__init__()

        self.set_shared(True)

    def do_create_element(self, url):

        pipeline = """
            v4l2src device=/dev/video8 !
            video/x-raw,width=640,height=480,framerate=25/1 !
            videoconvert !
            queue !
            x264enc tune=zerolatency speed-preset=ultrafast bitrate=1000 key-int-max=15 !
            rtph264pay name=pay0 pt=96 config-interval=1
        """

        return Gst.parse_launch(pipeline)


class SkyRangerRTSPServer:

    def __init__(self):

        self.server = GstRtspServer.RTSPServer()

        self.server.set_service("8554")

        factory = SkyRangerFactory()

        mounts = self.server.get_mount_points()

        mounts.add_factory("/fpv", factory)

        self.server.attach(None)

        print("\n===================================")
        print(" SkyRanger RTSP FPV Server Running ")
        print("===================================")

        print("\nRTSP URL:")
        print("rtsp://10.39.201.80:8554/fpv\n")


if __name__ == "__main__":

    server = SkyRangerRTSPServer()

    loop = GLib.MainLoop()

    loop.run()
