import { ArrowBackRounded } from "@mui/icons-material";
import {
  Container,
  Grid,
  IconButton,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import { useState } from "react";

enum Steps {
  Participate,
  Bid,
}

type StepType = { step: Steps; title: string };

export default function BidAuction() {
  const steps: StepType[] = [
    {
      step: Steps.Participate,
      title: "Participate",
    },
    {
      step: Steps.Bid,
      title: "Bid",
    },
  ];

  let [state, setState] = useState<{
    activeStep: StepType;
  }>({
    activeStep: steps[0],
  });

  function StepContent() {
    switch (state.activeStep.step) {
      case Steps.Participate:
        return <div>Participate</div>;
      case Steps.Bid:
        return <div>Bid</div>;
    }
  }

  function goBack(): void {
    var activeStepIndex = steps.findIndex(
      (s) => s.step === state.activeStep.step
    );
    var previousStepIndex = Math.max(activeStepIndex - 1, 0);

    setState({ ...state, activeStep: steps[previousStepIndex] });
  }

  return (
    <Container sx={{ maxWidth: "xl", pt: "10px" }}>
      <Stepper
        activeStep={state.activeStep.step}
        alternativeLabel
        sx={{ padding: "20px" }}
      >
        {steps.map((step) => (
          <Step key={step.step}>
            <StepLabel>{step.title}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Paper sx={{ padding: "20px" }} variant="outlined">
        <Grid container>
          <Grid item xs={1}>
            <IconButton
              sx={{ border: "1px solid black", borderRadius: "100px" }}
              onClick={() => goBack()}
            >
              <ArrowBackRounded></ArrowBackRounded>
            </IconButton>
          </Grid>
          <Grid item xs={11}>
            <Typography
              variant="h4"
              gutterBottom
              sx={{ pt: "20px", width: "100%" }}
              textAlign="center"
            >
              {state.activeStep.title}
            </Typography>
          </Grid>
        </Grid>
        <StepContent />
      </Paper>
    </Container>
  );
}
