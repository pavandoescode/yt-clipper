import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import ChannelStream from '@/models/ChannelStream';
import connectDB from '@/lib/db';

export async function POST(request) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

        if (!YOUTUBE_API_KEY) {
            return NextResponse.json({ message: 'YouTube API key not configured' }, { status: 400 });
        }

        // First, get channel ID from handle
        const handleUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=ezLiveOfficial&key=${YOUTUBE_API_KEY}`;
        const channelResponse = await fetch(handleUrl);
        const channelData = await channelResponse.json();

        if (!channelData.items || channelData.items.length === 0) {
            return NextResponse.json({ message: 'Channel not found' }, { status: 404 });
        }

        const channelId = channelData.items[0].id;
        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

        // Fetch videos from uploads playlist
        let allNewVideos = [];
        let nextPageToken = '';
        let foundExisting = false;

        do {
            const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&key=${YOUTUBE_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            const playlistResponse = await fetch(playlistUrl);
            const playlistData = await playlistResponse.json();

            if (playlistData.items) {
                for (const video of playlistData.items) {
                    const videoId = video.snippet.resourceId.videoId;
                    const existing = await ChannelStream.findOne({ videoId });

                    if (existing) {
                        foundExisting = true;
                        break;
                    }
                    allNewVideos.push(video);
                }
            }

            nextPageToken = playlistData.nextPageToken;
        } while (nextPageToken && !foundExisting);

        // If no new videos
        if (allNewVideos.length === 0) {
            const totalStreams = await ChannelStream.countDocuments();
            return NextResponse.json({
                message: 'No new livestreams found',
                newCount: 0,
                totalStreams
            });
        }

        // Get video details
        const videoIds = allNewVideos.map(v => v.snippet.resourceId.videoId).join(',');
        const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
        const videoDetailsResponse = await fetch(videoDetailsUrl);
        const videoDetailsData = await videoDetailsResponse.json();

        const detailsMap = {};
        if (videoDetailsData.items) {
            videoDetailsData.items.forEach(item => {
                detailsMap[item.id] = {
                    duration: item.contentDetails?.duration || '',
                    viewCount: item.statistics?.viewCount || ''
                };
            });
        }

        // Save new videos
        let newCount = 0;
        for (const video of allNewVideos) {
            const videoId = video.snippet.resourceId.videoId;
            const details = detailsMap[videoId] || {};

            await ChannelStream.create({
                videoId,
                title: video.snippet.title,
                thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
                channelId: channelId,
                channelTitle: video.snippet.channelTitle,
                publishedAt: new Date(video.snippet.publishedAt),
                duration: details.duration,
                viewCount: details.viewCount
            });
            newCount++;
        }

        const totalStreams = await ChannelStream.countDocuments();
        return NextResponse.json({
            message: `Fetched ${newCount} new livestreams`,
            newCount,
            totalStreams
        });

    } catch (error) {
        console.error('Fetch from YouTube error:', error);
        return NextResponse.json({ message: 'Failed to fetch from YouTube: ' + error.message }, { status: 500 });
    }
}
