package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.DTO.ChannelResponse;
import be.pxl.healthcareapi.services.WaveformStreamService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/channels")
public class ChannelController {
    private final WaveformStreamService streamService;

    public ChannelController(WaveformStreamService streamService) {
        this.streamService = streamService;
    }

    @GetMapping
    public ResponseEntity<List<ChannelResponse>> list() {
        return new ResponseEntity<>(streamService.channels().stream().map(ChannelResponse::from).toList(), HttpStatus.OK);
    }
}
